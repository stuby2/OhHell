import type { Card as CardType } from "@/lib/game-logic"
import PlayingCard from "./playing-card"

interface GameTableProps {
  currentTrick: Array<CardType & { playerId: number }>
  trumpCard: CardType | null
}

export default function GameTable({ currentTrick, trumpCard }: GameTableProps) {
  return (
    <div className="bg-green-800 p-6 rounded-xl min-h-[200px] flex flex-col items-center justify-center">
      <h3 className="text-white text-lg mb-4">Current Trick</h3>

      {trumpCard && (
        <div className="absolute top-4 right-4">
          <div className="text-white mb-1">Trump:</div>
          <PlayingCard card={trumpCard} disabled />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        {currentTrick.length === 0 ? (
          <p className="text-white italic">No cards played yet</p>
        ) : (
          currentTrick.map((card, index) => (
            <div key={`${card.suit}-${card.value}-${index}`} className="relative">
              <PlayingCard card={card} disabled />
              <div className="absolute -bottom-6 left-0 right-0 text-center text-white text-xs">
                Player {card.playerId}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

