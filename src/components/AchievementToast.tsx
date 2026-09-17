import { motion } from 'framer-motion'

interface Props {
  title: string
  detail: string
  onClose: () => void
}

export function AchievementToast({ title, detail, onClose }: Props) {
  return (
    <motion.button
      type="button"
      className="achieve"
      onClick={onClose}
      initial={{ x: 28, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 28, opacity: 0 }}
      role="status"
    >
      <i className="dex-medal is-lg" aria-hidden />
      <span>
        <b>{title}</b>
        <em>{detail}</em>
      </span>
    </motion.button>
  )
}
