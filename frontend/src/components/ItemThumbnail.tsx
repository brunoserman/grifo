import { useState } from 'react'
import type { Item } from '../types'
import TypeIcon, { isVideoSource } from './TypeIcon'

type Props = {
  item: Item
  size?: number
  className?: string
}

// The card's left-hand visual: a real preview image for a link that has one,
// otherwise a type icon (note / PDF / link / video) on a soft yellow gel tile.
// Falls back to the icon automatically if the image URL fails to load, so a
// broken thumbnail never leaves an empty hole in the list.
export default function ItemThumbnail({ item, size = 58, className }: Props) {
  const [failed, setFailed] = useState(false)
  const showImage = item.type === 'link' && !!item.thumbnail_url && !failed

  return (
    <div
      className={
        'flex shrink-0 items-center justify-center overflow-hidden rounded-gel-sm shadow-gel-icon ' +
        (showImage ? 'bg-ink-800' : 'bg-gel-icon-yellow') +
        (className ? ` ${className}` : '')
      }
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={item.thumbnail_url!}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <TypeIcon type={item.type} isVideo={isVideoSource(item)} size={23} />
      )}
    </div>
  )
}
