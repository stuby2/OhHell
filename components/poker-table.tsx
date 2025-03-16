"use client"

import { motion } from "framer-motion"
import type { Player, Card as CardType } from "@/lib/game-logic"
import PlayingCard from "./playing-card"
import { User, Monitor } from "lucide-react"

interface PokerTableProps {
  players: Player[]
  currentPlayer: number
  currentTrick: Array<CardType & { playerId: number }>
  trumpCard: CardType | null
  phase: string
  bids?: Record<number, number>
  trickWinner?: number
  dealerPosition?: number
  onPlayCard?: (card: CardType) => void
  isPlayerTurn?: boolean
}

export default function PokerTable({
  players,
  currentPlayer,
  currentTrick,
  trumpCard,
  phase,
  bids = {},
  trickWinner = -1,
  dealerPosition = 0,
  onPlayCard,
  isPlayerTurn = false,
}: PokerTableProps) {
  // Calculate positions for each player around the rectangular table
  const getPlayerPositions = () => {
    const positions: { x: number; y: number; rotation: number }[] = []
    const totalPlayers = players.length

    // Position players along the edges of the rectangle
    for (let i = 0; i < totalPlayers; i++) {
      let x = 50
      let y = 50
      let rotation = 0

      // Calculate position based on player index
      // For 4 players: bottom, right, top, left
      // For other numbers, distribute evenly
      if (totalPlayers <= 4) {
        if (i === 0) {
          // Human player at bottom
          x = 50
          y = 90
          rotation = 0
        } else if (i === 1) {
          // Right side
          x = 90
          y = 50
          rotation = 90
        } else if (i === 2) {
          // Top side
          x = 50
          y = 10
          rotation = 180
        } else if (i === 3) {
          // Left side
          x = 10
          y = 50
          rotation = 270
        }
      } else {
        // For more than 4 players, distribute evenly
        const angle = (Math.PI * 2 * i) / totalPlayers
        const radius = 40 // percentage of container
        x = 50 + radius * Math.cos(angle)
        y = 50 + radius * Math.sin(angle)
        rotation = (angle * 180) / Math.PI + 90
      }

      positions.push({ x, y, rotation })
    }

    return positions
  }

  const playerPositions = getPlayerPositions()

  // Find played card for a specific player
  const getPlayedCard = (playerId: number) => {
    return currentTrick.find((card) => card.playerId === playerId)
  }

  // Determine valid cards to play based on the lead suit (for human player)
  const getValidCards = (hand: CardType[]) => {
    if (currentTrick.length === 0) return hand

    const leadSuit = currentTrick[0].suit
    const hasSuit = hand.some((card) => card.suit === leadSuit)

    if (hasSuit) {
      return hand.filter((card) => card.suit === leadSuit)
    }

    return hand
  }

  // Get valid cards for human player
  const humanPlayer = players.find((p) => p.type === "human")
  const humanHand = humanPlayer?.hand || []
  const validCards = isPlayerTurn && phase === "playing" ? getValidCards(humanHand) : []

  return (
    <div className="relative w-full aspect-[4/3] bg-green-800 rounded-lg border-4 border-brown-800 shadow-xl overflow-hidden">
      {/* Table felt texture */}
      <div className="absolute inset-0 bg-[url('/placeholder.svg?height=800&width=1200')] bg-cover opacity-50 mix-blend-overlay"></div>

      {/* Trump card indicator - clearly in top-right corner */}
      {trumpCard && (
        <div className="absolute top-4 right-4 z-50">
          <div className="relative">
            <PlayingCard card={trumpCard} disabled className="scale-75" />
            <div className="absolute -top-6 left-0 right-0 text-center text-white text-xs bg-black/70 p-1 rounded">
              Trump
            </div>
          </div>
        </div>
      )}

      {/* Phase indicator - clearly in top-left corner */}
      <div className="absolute top-4 left-4 bg-black/80 text-white px-4 py-2 rounded-full text-sm z-50">
        {phase === "trickComplete"
          ? `${players[trickWinner]?.name} wins the trick!`
          : `${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase`}
      </div>

      {/* Players around the table */}
      {players.map((player, index) => {
        const position = playerPositions[index]
        const isHumanPlayer = player.type === "human"
        const isCurrentPlayer = currentPlayer === player.id
        const isDealer = dealerPosition === index
        const isWinner = trickWinner === player.id && phase === "trickComplete"
        const playedCard = getPlayedCard(player.id)

        // Calculate positions as percentages
        const playerX = `${position.x}%`
        const playerY = `${position.y}%`

        // Calculate played card position (closer to center)
        const playedCardX = `50%`
        const playedCardY = `50%`
        // Offset based on player position to form a small circle in the center
        const offsetX = (position.x - 50) * 0.3
        const offsetY = (position.y - 50) * 0.3
        const adjustedPlayedCardX = `calc(${playedCardX} + ${offsetX}%)`
        const adjustedPlayedCardY = `calc(${playedCardY} + ${offsetY}%)`

        return (
          <div key={player.id}>
            {/* Player position */}
            <div
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center
                ${isCurrentPlayer ? "z-20" : "z-10"}`}
              style={{
                left: playerX,
                top: playerY,
              }}
            >
              {/* Player avatar and name */}
              <div
                className={`flex flex-col items-center mb-2 p-2 rounded-full
                  ${isCurrentPlayer ? "bg-yellow-300/50" : ""}
                  ${isWinner ? "bg-green-500/50" : ""}
                  ${!isCurrentPlayer && !isWinner ? "bg-gray-800/30" : ""}
                  ${isHumanPlayer ? "text-blue-300" : "text-gray-300"}`}
                style={{ transform: `rotate(${position.rotation}deg)` }}
              >
                <div style={{ transform: `rotate(${-position.rotation}deg)` }}>
                  {isHumanPlayer ? <User className="h-8 w-8" /> : <Monitor className="h-8 w-8" />}
                  <div className="text-xs font-bold mt-1 whitespace-nowrap">
                    {player.name}
                    {isDealer && <span className="ml-1">(D)</span>}
                  </div>
                  {/* Show bid if placed */}
                  {bids[player.id] !== undefined && bids[player.id] !== -1 && (
                    <div className="text-xs mt-1 bg-black/50 px-2 py-1 rounded-full">Bid: {bids[player.id]}</div>
                  )}
                </div>
              </div>

              {/* Player's hand - overlapping cards */}
              {player.hand && player.hand.length > 0 && (
                <div style={{ transform: `rotate(${position.rotation}deg)` }}>
                  <div style={{ transform: `rotate(${-position.rotation}deg)` }}>
                    {isHumanPlayer ? (
                      <div className="flex">
                        {player.hand.map((card, cardIndex) => {
                          const isValid = validCards.some((c) => c.suit === card.suit && c.value === card.value)
                          const canPlay = isPlayerTurn && phase === "playing" && isValid

                          return (
                            <motion.div
                              key={`${card.suit}-${card.value}`}
                              className="relative cursor-pointer"
                              style={{
                                marginLeft: cardIndex > 0 ? "-40px" : "0", // Heavy overlap
                                zIndex: cardIndex, // Stack cards
                              }}
                              whileHover={canPlay ? { y: -15 } : {}}
                              onClick={() => canPlay && onPlayCard && onPlayCard(card)}
                            >
                              <PlayingCard card={card} disabled={!canPlay} className={!isValid ? "opacity-50" : ""} />
                              {canPlay && (
                                <div className="absolute -bottom-4 left-0 right-0 text-center text-xs text-white bg-green-600 rounded-full px-2 py-0.5 opacity-80">
                                  Play
                                </div>
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                    ) : (
                      // For CPU players, show face down cards with overlap
                      <div className="flex">
                        {player.hand.map((_, cardIndex) => (
                          <div
                            key={cardIndex}
                            className="relative"
                            style={{
                              marginLeft: cardIndex > 0 ? "-40px" : "0", // Heavy overlap
                              zIndex: cardIndex,
                            }}
                          >
                            <div className="w-12 h-18 bg-red-900 rounded-md border-2 border-white scale-75"></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Played card (if any) */}
            {playedCard && (
              <motion.div
                initial={{
                  opacity: 0,
                  x: playerX,
                  y: playerY,
                  rotate: position.rotation,
                  scale: 0.5,
                }}
                animate={{
                  opacity: 1,
                  x: adjustedPlayedCardX,
                  y: adjustedPlayedCardY,
                  rotate: 0,
                  scale: 1,
                  boxShadow: isWinner && phase === "trickComplete" ? "0 0 15px 5px rgba(255, 255, 0, 0.7)" : "none",
                }}
                transition={{ duration: 0.5 }}
                className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: adjustedPlayedCardX,
                  top: adjustedPlayedCardY,
                }}
              >
                <PlayingCard card={playedCard} disabled />
              </motion.div>
            )}
          </div>
        )
      })}

      {/* Table center decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[15%] h-[15%] rounded-full bg-green-900/50 border-4 border-green-700/30"></div>

      {/* Bidding UI for human player */}
      {phase === "bidding" && currentPlayer === humanPlayer?.id && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 p-4 rounded-lg flex items-center space-x-4 z-40">
          <span className="text-white">Your Bid:</span>
          <div className="flex items-center space-x-2">
            {Array.from({ length: (humanHand?.length || 0) + 1 }).map((_, i) => (
              <button
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center
                  ${bids[humanPlayer?.id] === i ? "bg-blue-500 text-white" : "bg-white text-black hover:bg-blue-200"}`}
                onClick={() => onPlayCard && onPlayCard({ value: i.toString() as any, suit: "bid" as any })}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

