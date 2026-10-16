import {
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Brain,
  Check,
  Cpu,
  FileText,
  ShieldCheck,
  Sparkles,
  Sun,
  Terminal,
} from 'lucide-react'
import { crystallizeSteps, proposedMemories, recallSources } from '../mockData'
import type { RecallKind } from '../mockData'

const SOURCE_ICON: Record<RecallKind, typeof FileText> = {
  note: FileText,
  memory: Brain,
  session: Terminal,
  day: Sun,
  wiki: BookOpen,
}

const SOURCE_TONE: Record<RecallKind, string> = {
  note: 'dl-tone-teal',
  memory: 'dl-tone-amber',
  session: 'dl-tone-iris',
  day: 'dl-tone-coral',
  wiki: 'dl-tone-sky',
}

export function ChitLab() {
  return (
    <div className="dl-chit">
      <div className="dl-chit__route">
        <span className="dl-chip dl-chip--route">
          <span className="dl-chip__orb" />
          via Chitragupta · local daemon
        </span>
        <span className="dl-chip">
          <Cpu size={11} />
          memory + notes
        </span>
        <span className="dl-chip">
          <ShieldCheck size={11} />
          Nothing leaves this machine
        </span>
      </div>

      <div className="dl-chit__strip">
        <span>daemon v0.9.2 · running</span>
        <span>5 capabilities ready</span>
        <span>lat 38ms · local</span>
      </div>

      <div className="dl-chit__thread">
        <div className="dl-bubble dl-bubble--user">
          What did I decide about the memory layer last week?
        </div>

        <div className="dl-bubble dl-bubble--agent">
          You decided to keep the memory layer append-only, with recall routed through
          Chitragupta and every write-back requiring your explicit approval
          <span className="dl-ref">2</span>. You also wanted morning briefings to lead with
          actionable items<span className="dl-ref">1</span>.
          <div className="dl-toolrow">
            <span className="dl-tool">
              <Check size={9} />
              recall.unified
            </span>
            <span className="dl-tool">
              <Check size={9} />
              memory.search
            </span>
          </div>
          <div className="dl-confidence">
            <span>Confidence</span>
            <div className="dl-meter">
              <i style={{ width: '87%' }} />
            </div>
            <span>0.87</span>
          </div>
          <div className="dl-sources">
            {recallSources.map((src) => {
              const Icon = SOURCE_ICON[src.kind]
              return (
                <div className={`dl-card dl-source ${SOURCE_TONE[src.kind]}`} key={src.ref}>
                  <div className="dl-source__icon">
                    <Icon size={12} />
                  </div>
                  <div>
                    <div className="dl-source__title">
                      {src.title}
                      <span className="dl-source__ref">· {src.ref}</span>
                    </div>
                    <div className="dl-source__detail">{src.detail}</div>
                    <div className="dl-source__score">
                      <span>{src.score.toFixed(2)}</span>
                      <div className="dl-meter">
                        <i style={{ width: `${src.score * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="dl-card dl-body dl-remember">
          <div className="dl-remember__head">
            <Brain size={11} />
            Chitragupta wants to remember
          </div>
          <p className="dl-remember__text">{proposedMemories[0].text}</p>
          <div className="dl-remember__why">Why: {proposedMemories[0].why}</div>
          <div className="dl-remember__actions">
            <button className="dl-btn dl-btn--primary" type="button">
              Accept
            </button>
            <button className="dl-btn" type="button">
              Edit
            </button>
            <button className="dl-btn dl-btn--ghost" type="button">
              Decline
            </button>
          </div>
        </div>

        <div className="dl-card dl-body">
          <div className="dl-card__head" style={{ padding: 0 }}>
            <span className="dl-overline">Crystallize thread</span>
            <span className="dl-card__link">
              Review draft
              <ArrowUpRight size={11} />
            </span>
          </div>
          <div className="dl-crys__steps">
            {crystallizeSteps.map((step) => (
              <div
                className={
                  step.state === 'done'
                    ? 'dl-crys__step dl-crys__step--done'
                    : step.state === 'active'
                      ? 'dl-crys__step dl-crys__step--active'
                      : 'dl-crys__step'
                }
                key={step.label}
              >
                {step.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dl-composer">
        <div className="dl-composer__input">
          <Sparkles size={13} />
          <span>Ask across your vault…</span>
        </div>
        <button className="dl-composer__send" type="button">
          <ArrowUp size={15} />
        </button>
      </div>
    </div>
  )
}
