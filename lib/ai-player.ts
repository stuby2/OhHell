import type { GameState, Player, Card } from "@/lib/game-logic"
import { determineBid } from "./bidding-strategy"
import { determineCardToPlay } from "./play-strategy"

interface AIPlayerTurnProps {
  gameState: GameState
  player: Player
  forbiddenBid: number | null
  onPlaceBid: (bid: number) => void
  onPlayCard: (card: Card) => void
  canLeadWithTrump: boolean
}

/**
 * Main function to handle an AI player's turn
 * This coordinates between bidding and playing strategies
 */
export function handleAIPlayerTurn({
  gameState,
  player,
  forbiddenBid,
  onPlaceBid,
  onPlayCard,
  canLeadWithTrump,
}: AIPlayerTurnProps) {
  // Handle bidding phase
  if (gameState.phase === "bidding") {
    const bid = determineBid({
      player,
      gameState,
      forbiddenBid,
      difficulty: player.difficulty || "medium",
    })

    onPlaceBid(bid)
  }
  // Handle playing phase
  else if (gameState.phase === "playing") {
    const cardToPlay = determineCardToPlay({
      player,
      gameState,
      difficulty: player.difficulty || "medium",
      canLeadWithTrump,
    })

    if (cardToPlay && player.hand?.includes(cardToPlay)) {
      onPlayCard(cardToPlay)
    } else if (player.hand && player.hand.length > 0) {
      // Fallback to playing the first card if something went wrong
      onPlayCard(player.hand[0])
    }
  }
}

