"use client"

import type { Card as CardType } from "@/lib/game-logic"

interface PlayingCardProps {
  card: CardType
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export default function PlayingCard({ card, onClick, disabled = false, className = "" }: PlayingCardProps) {
  const getSuitColor = (suit: string) => {
    return suit === "hearts" || suit === "diamonds" ? "text-red-500" : "text-black"
  }

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case "hearts":
        return "♥"
      case "diamonds":
        return "♦"
      case "clubs":
        return "♣"
      case "spades":
        return "♠"
      default:
        return suit
    }
  }

  const suitSymbol = getSuitSymbol(card.suit)

  return (
    <div
      className={`w-16 h-24 bg-white rounded-md border border-gray-300 flex flex-col justify-between p-1.5 shadow-md
        ${disabled ? "cursor-default" : "cursor-pointer hover:shadow-lg transition-all duration-200"}
        ${className}`}
      onClick={() => !disabled && onClick && onClick()}
    >
      <div className={`text-base font-bold ${getSuitColor(card.suit)}`}>
        {card.value}
        <span className="ml-1">{suitSymbol}</span>
      </div>

      <div className={`text-3xl text-center ${getSuitColor(card.suit)}`}>{suitSymbol}</div>

      <div className={`text-base font-bold self-end rotate-180 ${getSuitColor(card.suit)}`}>
        {card.value}
        <span className="ml-1">{suitSymbol}</span>
      </div>
    </div>
  )
}

