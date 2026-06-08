import { QuestWithProgress } from '@/lib/questUtils'

interface ProfileData {
  totalXp: number
  level: number
  levelName: string
  currentLevelXp: number
  xpNeededForNextLevel: number
  progressPercent: number
}

interface Props {
  quests: QuestWithProgress[]
  profile: ProfileData
}

function QuestStatusBadge({ status }: { status: 'locked' | 'active' | 'completed' }) {
  if (status === 'completed') {
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#f59e0b',
          background: 'rgba(245,158,11,0.12)',
          borderRadius: '4px',
          padding: '2px 7px',
        }}
      >
        ✅ הושלם
      </span>
    )
  }
  if (status === 'locked') {
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
          padding: '2px 7px',
        }}
      >
        🔒 לא התחיל
      </span>
    )
  }
  return (
    <span
      style={{
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--accent-purple)',
        background: 'rgba(124,58,237,0.12)',
        borderRadius: '4px',
        padding: '2px 7px',
      }}
    >
      ⚡ בתהליך
    </span>
  )
}

export default function QuestsClient({ quests, profile }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          📜 Main Quests
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          המשימות הגדולות שמגדירות את הדרך שלך
        </p>
      </div>

      {/* Player Card */}
      <div
        className="card p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(245,158,11,0.08))',
          border: '1.5px solid rgba(124,58,237,0.4)',
        }}
      >
        <div className="flex items-start gap-4">
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '22px',
              fontWeight: 800,
              color: '#fff',
            }}
          >
            {profile.level}
          </div>
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Lv. {profile.level}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>
                {profile.levelName}
              </span>
            </div>
            <p className="text-lg font-bold mt-1" style={{ color: 'var(--accent-gold)' }}>
              ⚡ {profile.totalXp.toLocaleString()} XP
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                <span>
                  {profile.currentLevelXp.toLocaleString()} / {profile.xpNeededForNextLevel.toLocaleString()} XP to next level
                </span>
                <span>{profile.progressPercent}%</span>
              </div>
              <div
                style={{
                  height: '8px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${profile.progressPercent}%`,
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-gold))',
                    transition: 'width 500ms ease',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quest list */}
      <div className="space-y-3">
        {quests.map((q) => {
          const status: 'locked' | 'active' | 'completed' = q.isCompleted
            ? 'completed'
            : q.progress > 0
            ? 'active'
            : 'locked'
          const pct = Math.min(1, q.progress / q.requirement.value)

          return (
            <div
              key={q.id}
              className="card p-4"
              style={{
                border: q.isCompleted
                  ? '1.5px solid rgba(245,158,11,0.5)'
                  : status === 'active'
                  ? '1.5px solid rgba(124,58,237,0.4)'
                  : '1px solid var(--border)',
                background: q.isCompleted
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.07), var(--bg-card))'
                  : 'var(--bg-card)',
                boxShadow: status === 'active' ? '0 0 0 3px rgba(124,58,237,0.08)' : 'none',
                opacity: status === 'locked' ? 0.6 : 1,
                transition: 'border 200ms, opacity 200ms',
              }}
            >
              <div className="flex items-start gap-4">
                <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{q.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="font-semibold"
                      style={{ color: 'var(--text-primary)', fontSize: '15px' }}
                    >
                      {q.title}
                    </span>
                    <QuestStatusBadge status={status} />
                    <span
                      style={{
                        marginRight: 'auto',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: q.isCompleted ? '#f59e0b' : 'var(--text-secondary)',
                      }}
                    >
                      +{q.xpReward.toLocaleString()} XP
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      marginBottom: '8px',
                    }}
                  >
                    {q.description}
                  </p>

                  {/* Progress row */}
                  <div>
                    <div
                      className="flex justify-between text-xs mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span>
                        {q.progress.toLocaleString()} / {q.requirement.value.toLocaleString()}
                      </span>
                      {q.isCompleted && q.completedAt && (
                        <span style={{ color: '#f59e0b' }}>
                          {new Date(q.completedAt).toLocaleDateString('he-IL')}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        height: '5px',
                        borderRadius: '3px',
                        background: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct * 100}%`,
                          borderRadius: '3px',
                          background: q.isCompleted ? '#f59e0b' : 'var(--accent-purple)',
                          transition: 'width 300ms ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
