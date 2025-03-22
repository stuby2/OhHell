"use client"

import { motion } from "framer-motion"
import type { Player, Card as CardType, GameState } from "@/lib/game-logic"
import PlayingCard from "./playing-card"
import { User, Monitor } from "lucide-react"
import FaceDownCard from "./face-down-card"

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
  forbiddenBid?: number | null
  gameState: GameState
  onContinue?: () => void
  boardColor?: string
  canLeadWithTrump?: boolean
  optLeadWithTrump?: boolean
  trumpBroken?: boolean
  roundInfo?: {
    currentRound: number
    totalRounds: number
    completedRounds: number
  }
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
  forbiddenBid = null,
  gameState,
  onContinue,
  boardColor = "bg-green-800",
  canLeadWithTrump = false,
  optLeadWithTrump = false,
  trumpBroken = false,
  roundInfo,
}: PokerTableProps) {
  // Find players
  const humanPlayer = players.find((p) => p.type === "human")
  const cpuPlayers = players.filter((p) => p.type === "cpu")

  // Get human player's hand and valid cards
  const humanHand = humanPlayer?.hand || []
  const validCards = isPlayerTurn && phase === "playing" ? getValidCards(humanHand) : []

  // Helper functions
  function getPlayedCard(playerId: number) {
    return currentTrick.find((card) => card.playerId === playerId)
  }

  function getValidCards(hand: CardType[]) {
    // If this is the first card in the trick
    if (currentTrick.length === 0) {
      // If leading with trump is not allowed and we have non-trump cards
      if (!canLeadWithTrump && trumpCard) {
        const nonTrumpCards = hand.filter((card) => card.suit !== trumpCard.suit)
        // If we have non-trump cards, only those are valid
        if (nonTrumpCards.length > 0) {
          return nonTrumpCards
        }
      }
      // Otherwise all cards are valid
      return hand
    }

    // If not leading, follow suit if possible
    const leadSuit = currentTrick[0].suit
    const hasSuit = hand.some((card) => card.suit === leadSuit)

    if (hasSuit) {
      return hand.filter((card) => card.suit === leadSuit)
    }

    // If can't follow suit, any card is valid
    return hand
  }

  function calculateTotalBids() {
    let total = 0
    Object.values(bids).forEach((bid) => {
      if (bid !== -1) {
        total += bid
      }
    })
    return total
  }

  function handleTableClick() {
    if (phase === "trickComplete" && onContinue) {
      onContinue()
    }
  }

  return (
    <div
      className={`relative w-full aspect-[4/3] ${boardColor} rounded-lg border-4 border-brown-800 shadow-xl overflow-hidden`}
      onClick={handleTableClick}
    >
      {/* Trump card display */}
      {trumpCard && (
        <div className="absolute top-[70%] right-4 transform -translate-y-1/2 z-50">
          <div className="relative flex flex-col items-center space-y-2">
            <div className="text-white text-xs bg-black/70 p-1 px-3 rounded">
              Trump {!optLeadWithTrump && trumpBroken && <span className="ml-1">(Broken)</span>}
            </div>
            <PlayingCard card={trumpCard} disabled />

            <div className="text-white text-xs bg-black/70 p-1 px-3 rounded mt-1">
              Tricks spoken for: {calculateTotalBids()}/{gameState.currentRound}
            </div>
          </div>
        </div>
      )}

      {/* Round counter */}
      {roundInfo && (
        <div className="absolute top-2 left-4 z-50">
          <div className="text-white text-xs bg-black/70 p-1 px-3 rounded">
            Round: {roundInfo.currentRound}
            <span className="ml-1">{roundInfo.currentRound === roundInfo.completedRounds + 1 ? "↑" : "↓"}</span>
            <span className="ml-1">
              ({roundInfo.completedRounds + 1}/{roundInfo.totalRounds})
            </span>
          </div>
        </div>
      )}

      {/* CPU Players */}
      <div className="absolute top-[10%] left-0 right-0 flex justify-center z-10">
        <div className="flex justify-center w-full px-2 flex-wrap">
          {cpuPlayers.map((player) => {
            const isCurrentPlayer = currentPlayer === player.id
            const isDealer = dealerPosition === player.id
            const isWinner = trickWinner === player.id && phase === "trickComplete"
            const playedCard = getPlayedCard(player.id)
            const hasCards = player.hand && player.hand.length > 0

            return (
              <div key={player.id} className="flex flex-col items-center mx-2 mb-2">
                {/* Face down card behind CPU avatar if they have cards */}
                {hasCards && (
                  <div className="absolute transform scale-75 -z-10" style={{ marginTop: "-5px" }}>
                    <FaceDownCard />
                  </div>
                )}

                {/* CPU Avatar and Info */}
                <div
                  className={`flex flex-col items-center p-1.5 rounded-full z-10
                    ${isCurrentPlayer ? "bg-yellow-300/50" : ""}
                    ${isWinner ? "bg-green-500/50" : ""}
                    ${!isCurrentPlayer && !isWinner ? "bg-gray-800/30" : ""}
                    text-gray-300`}
                >
                  <Monitor className="h-7 w-7" />
                  <div className="text-xs font-bold mt-0.5 whitespace-nowrap text-center">
                    {player.name}
                    {isDealer && <span className="ml-1">(D)</span>}
                  </div>

                  {/* Bid and Tricks info */}
                  {bids[player.id] !== undefined && bids[player.id] !== -1 && (
                    <div className="text-xs mt-0.5 bg-black/70 px-2 py-0.5 rounded-full">Bid: {bids[player.id]}</div>
                  )}
                  <div className="text-xs mt-0.5 bg-black/70 px-2 py-0.5 rounded-full">
                    Tricks: {gameState.tricks[player.id] || 0}
                  </div>
                </div>

                {/* CPU Played Card */}
                {playedCard && (
                  <div className="mt-4">
                    <div className={`relative ${isWinner ? "animate-pulse" : ""}`}>
                      <PlayingCard
                        card={playedCard}
                        disabled
                        className={isWinner ? "shadow-[0_0_15px_5px_rgba(255,255,0,0.7)]" : ""}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Human Player's played card */}
      {humanPlayer && getPlayedCard(humanPlayer.id) && (
        <div className="absolute top-[55%] left-0 right-0 flex justify-center z-20">
          <div
            className={`relative ${phase === "trickComplete" && trickWinner === humanPlayer.id ? "animate-pulse" : ""}`}
          >
            <PlayingCard
              card={getPlayedCard(humanPlayer.id)!}
              disabled
              className={
                phase === "trickComplete" && trickWinner === humanPlayer.id
                  ? "shadow-[0_0_15px_5px_rgba(255,255,0,0.7)]"
                  : ""
              }
            />
            <div className="absolute -bottom-5 left-0 right-0 text-center text-xs text-white bg-black/70 p-1 rounded">
              {humanPlayer.name}
            </div>
          </div>
        </div>
      )}

      {/* Human Player */}
      {humanPlayer && (
        <>
          {/* Player avatar and info */}
          <div
            className={`absolute bottom-6 left-[25%] transform -translate-x-1/2 flex flex-col items-center p-3 rounded-full bg-green-700/70 z-30
              ${currentPlayer === humanPlayer.id ? "bg-yellow-300/50" : ""}
              ${trickWinner === humanPlayer.id && phase === "trickComplete" ? "bg-green-500/50" : ""}
              text-blue-300`}
          >
            <User className="h-10 w-10" />
            <div className="text-sm font-bold mt-1 whitespace-nowrap">
              {humanPlayer.name}
              {dealerPosition === humanPlayer.id && <span className="ml-1">(D)</span>}
            </div>

            {/* Bid and Tricks info */}
            {bids[humanPlayer.id] !== undefined && bids[humanPlayer.id] !== -1 && (
              <div className="text-xs mt-1 bg-black/70 px-2 py-1 rounded-full">Bid: {bids[humanPlayer.id]}</div>
            )}
            <div className="text-xs mt-1 bg-black/70 px-2 py-1 rounded-full">
              Tricks: {gameState.tricks[humanPlayer.id] || 0}
            </div>
          </div>

          {/* Player's hand */}
          {humanPlayer.hand && humanPlayer.hand.length > 0 && (
            <div className="absolute bottom-6 right-[45%] transform translate-x-1/2 flex z-30">
              {humanPlayer.hand.map((card, cardIndex) => {
                const isValid = validCards.some((c) => c.suit === card.suit && c.value === card.value)
                const canPlay = isPlayerTurn && phase === "playing" && isValid

                return (
                  <motion.div
                    key={`${card.suit}-${card.value}`}
                    className="relative cursor-pointer"
                    style={{
                      marginLeft: cardIndex > 0 ? "-30px" : "0", // Less overlap for better visibility
                      zIndex: cardIndex, // Stack cards
                    }}
                    whileHover={canPlay ? { y: -15 } : {}}
                    onClick={() => canPlay && onPlayCard && onPlayCard(card)}
                  >
                    <PlayingCard card={card} disabled={!canPlay} />
                    {canPlay && (
                      <div className="absolute -bottom-4 left-0 right-0 text-center text-xs text-white bg-green-600 rounded-full px-2 py-0.5 opacity-80">
                        Play
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Click to continue message */}
      {phase === "trickComplete" && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white px-4 py-2 rounded-lg text-sm animate-pulse z-50">
          Click to continue...
        </div>
      )}

      {/* Bidding UI for human player */}
      {phase === "bidding" && currentPlayer === humanPlayer?.id && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 p-4 rounded-lg flex flex-col items-center space-y-4 z-40">
          <span className="text-white font-bold">Your Bid:</span>
          <div className="flex flex-wrap justify-center gap-2 max-w-xs">
            {Array.from({ length: (humanHand?.length || 0) + 1 }).map((_, i) => {
              const isForbidden = forbiddenBid === i
              return (
                <button
                  key={i}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                    ${bids[humanPlayer?.id] === i ? "bg-blue-500 text-white" : ""}
                    ${isForbidden ? "bg-red-500 text-white cursor-not-allowed opacity-50" : "bg-white text-black hover:bg-blue-200"}
                  `}
                  onClick={() =>
                    !isForbidden && onPlayCard && onPlayCard({ value: i.toString() as any, suit: "bid" as any })
                  }
                  disabled={isForbidden}
                >
                  {i}
                </button>
              )
            })}
          </div>
          <div className="text-white text-sm">Tricks spoken for: {calculateTotalBids()}</div>
        </div>
      )}
    </div>
  )
}

