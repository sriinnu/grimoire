use serde::Serialize;
use std::fs;
use std::path::Path;
use tree_sitter::{Language, Node, Parser};

const MAX_SOURCE_BYTES: u64 = 2 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeSymbolSnapshot {
    pub language: String,
    pub supported: bool,
    pub parse_error_count: usize,
    pub symbols: Vec<CodeSymbol>,
    pub imports: Vec<CodeImport>,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CodeSymbol {
    pub name: String,
    pub kind: String,
    pub line: usize,
    pub column: usize,
    pub end_line: usize,
    pub end_column: usize,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CodeImport {
    pub statement: String,
    pub line: usize,
    pub column: usize,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum CodeLanguage {
    Go,
    Python,
    Rust,
    TypeScript,
    Tsx,
}

impl CodeLanguage {
    fn from_path(path: &Path) -> Option<Self> {
        match path.extension()?.to_str()?.to_ascii_lowercase().as_str() {
            "go" => Some(Self::Go),
            "py" => Some(Self::Python),
            "rs" => Some(Self::Rust),
            "ts" => Some(Self::TypeScript),
            "tsx" | "jsx" => Some(Self::Tsx),
            _ => None,
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Go => "go",
            Self::Python => "python",
            Self::Rust => "rust",
            Self::TypeScript => "typescript",
            Self::Tsx => "tsx",
        }
    }

    fn grammar(self) -> Language {
        match self {
            Self::Go => tree_sitter_go::LANGUAGE.into(),
            Self::Python => tree_sitter_python::LANGUAGE.into(),
            Self::Rust => tree_sitter_rust::LANGUAGE.into(),
            Self::TypeScript => tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into(),
            Self::Tsx => tree_sitter_typescript::LANGUAGE_TSX.into(),
        }
    }
}

/// Produce local, inspectable syntax facts from a supported source file.
/// This is intentionally Tree-sitter-backed—not a regex approximation of an IDE.
pub fn inspect_code_symbols(path: &Path) -> Result<CodeSymbolSnapshot, String> {
    let Some(language) = CodeLanguage::from_path(path) else {
        return Ok(empty_snapshot("unsupported"));
    };
    let metadata =
        fs::metadata(path).map_err(|error| format!("Could not inspect code file: {error}"))?;
    if metadata.len() > MAX_SOURCE_BYTES {
        return Err(format!(
            "Code file exceeds the {} MiB local parsing limit",
            MAX_SOURCE_BYTES / 1024 / 1024
        ));
    }
    let source =
        fs::read_to_string(path).map_err(|error| format!("Could not read code file: {error}"))?;
    inspect_source(language, &source)
}

fn empty_snapshot(language: &str) -> CodeSymbolSnapshot {
    CodeSymbolSnapshot {
        language: language.to_string(),
        supported: false,
        parse_error_count: 0,
        symbols: Vec::new(),
        imports: Vec::new(),
    }
}

fn inspect_source(language: CodeLanguage, source: &str) -> Result<CodeSymbolSnapshot, String> {
    let mut parser = Parser::new();
    parser
        .set_language(&language.grammar())
        .map_err(|error| format!("Could not initialize {} parser: {error}", language.label()))?;
    let tree = parser
        .parse(source, None)
        .ok_or_else(|| "Code parser did not return a syntax tree".to_string())?;
    let mut symbols = Vec::new();
    let mut imports = Vec::new();
    collect_syntax_facts(
        language,
        tree.root_node(),
        source,
        &mut symbols,
        &mut imports,
    );
    symbols.sort_by_key(|symbol| (symbol.line, symbol.column));
    imports.sort_by_key(|import| (import.line, import.column));

    Ok(CodeSymbolSnapshot {
        language: language.label().to_string(),
        supported: true,
        parse_error_count: count_error_nodes(tree.root_node()),
        symbols,
        imports,
    })
}

fn collect_syntax_facts(
    language: CodeLanguage,
    node: Node<'_>,
    source: &str,
    symbols: &mut Vec<CodeSymbol>,
    imports: &mut Vec<CodeImport>,
) {
    if let Some(kind) = symbol_kind(language, node.kind()) {
        if let Some(name) = symbol_name(node, source) {
            symbols.push(code_symbol(kind, name, node));
        }
    }
    if is_import(language, node.kind()) {
        imports.push(CodeImport {
            statement: source_text(node, source).trim().to_string(),
            line: node.start_position().row + 1,
            column: node.start_position().column + 1,
        });
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        collect_syntax_facts(language, child, source, symbols, imports);
    }
}

fn symbol_kind(language: CodeLanguage, node_kind: &str) -> Option<&'static str> {
    match language {
        CodeLanguage::TypeScript | CodeLanguage::Tsx => match node_kind {
            "function_declaration" | "generator_function_declaration" | "method_definition" => {
                Some("function")
            }
            "class_declaration" | "abstract_class_declaration" => Some("class"),
            "interface_declaration" => Some("interface"),
            "type_alias_declaration" => Some("type"),
            "enum_declaration" => Some("enum"),
            "variable_declarator" => Some("variable"),
            _ => None,
        },
        CodeLanguage::Rust => match node_kind {
            "function_item" => Some("function"),
            "struct_item" => Some("struct"),
            "enum_item" => Some("enum"),
            "trait_item" => Some("trait"),
            "impl_item" => Some("implementation"),
            "mod_item" => Some("module"),
            _ => None,
        },
        CodeLanguage::Python => match node_kind {
            "function_definition" => Some("function"),
            "class_definition" => Some("class"),
            _ => None,
        },
        CodeLanguage::Go => match node_kind {
            "function_declaration" | "method_declaration" => Some("function"),
            "type_spec" => Some("type"),
            _ => None,
        },
    }
}

fn is_import(language: CodeLanguage, node_kind: &str) -> bool {
    match language {
        CodeLanguage::TypeScript | CodeLanguage::Tsx => node_kind == "import_statement",
        CodeLanguage::Rust => node_kind == "use_declaration",
        CodeLanguage::Python => matches!(node_kind, "import_statement" | "import_from_statement"),
        CodeLanguage::Go => node_kind == "import_declaration",
    }
}

fn symbol_name(node: Node<'_>, source: &str) -> Option<String> {
    node.child_by_field_name("name")
        .map(|name| source_text(name, source).trim().to_string())
        .filter(|name| !name.is_empty())
}

fn code_symbol(kind: &str, name: String, node: Node<'_>) -> CodeSymbol {
    let start = node.start_position();
    let end = node.end_position();
    CodeSymbol {
        name,
        kind: kind.to_string(),
        line: start.row + 1,
        column: start.column + 1,
        end_line: end.row + 1,
        end_column: end.column + 1,
    }
}

fn source_text<'a>(node: Node<'_>, source: &'a str) -> &'a str {
    &source[node.byte_range()]
}

fn count_error_nodes(node: Node<'_>) -> usize {
    let own = usize::from(node.is_error() || node.is_missing());
    let mut cursor = node.walk();
    own + node
        .children(&mut cursor)
        .map(count_error_nodes)
        .sum::<usize>()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn typescript_symbols_and_imports_come_from_the_syntax_tree() {
        let source = "import { build } from './context'\nexport class Manifest {\n  render() {}\n}\nconst packet = build()\n";
        let snapshot = inspect_source(CodeLanguage::TypeScript, source).unwrap();

        assert!(snapshot.supported);
        assert_eq!(
            snapshot.imports[0].statement,
            "import { build } from './context'"
        );
        assert_eq!(
            snapshot
                .symbols
                .iter()
                .map(|symbol| (symbol.kind.as_str(), symbol.name.as_str()))
                .collect::<Vec<_>>(),
            vec![
                ("class", "Manifest"),
                ("function", "render"),
                ("variable", "packet"),
            ],
        );
    }

    #[test]
    fn rust_and_python_have_real_language_specific_syntax_facts() {
        let rust = inspect_source(
            CodeLanguage::Rust,
            "use crate::vault::VaultEntry;\npub struct Packet;\nfn build() {}\n",
        )
        .unwrap();
        let python = inspect_source(
            CodeLanguage::Python,
            "from vault import Entry\nclass Packet:\n    def build(self):\n        pass\n",
        )
        .unwrap();

        assert_eq!(
            rust.symbols
                .iter()
                .map(|symbol| symbol.name.as_str())
                .collect::<Vec<_>>(),
            vec!["Packet", "build"]
        );
        assert_eq!(
            python
                .symbols
                .iter()
                .map(|symbol| symbol.name.as_str())
                .collect::<Vec<_>>(),
            vec!["Packet", "build"]
        );
        assert_eq!(rust.imports.len(), 1);
        assert_eq!(python.imports.len(), 1);
    }
}
