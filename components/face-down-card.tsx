"use client"

import Image from "next/image"

interface FaceDownCardProps {
  className?: string
}

export default function FaceDownCard({ className = "" }: FaceDownCardProps) {
  return (
    <div
      className={`w-16 h-24 relative rounded-md border border-gray-300 shadow-md overflow-hidden
        ${className}`}
    >
      <Image src="/img/playingCard1.jpg" alt="Card back" fill className="object-cover" priority />
    </div>
  )
}

