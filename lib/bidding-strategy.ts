import type { GameState, Player, Card } from "@/lib/game-logic"

interface BidStrategyProps {
  player: Player
  gameState: GameState
  forbiddenBid: number | null
  difficulty: "easy" | "medium" | "hard"
}

/**
 * Determines the optimal bid for an AI player based on their hand and game state
 */
export function determineBid({ player, gameState, forbiddenBid, difficulty }: BidStrategyProps): number {
  const hand = player.hand || []
  const cardsInRound = gameState.currentRound
  const isDealer = player.id === gameState.dealerPosition

  // If this is the dealer and there's a forbidden bid, we need to avoid it
  if (isDealer && forbiddenBid !== null) {
    return calculateDealerBid(hand, forbiddenBid, difficulty, cardsInRound)
  }

  // For non-dealer players, calculate bid based on difficulty
  return calculateNormalBid(hand, difficulty, gameState)
}

/**
 * Calculate bid for the dealer, avoiding the forbidden bid
 */
function calculateDealerBid(
  hand: Card[],
  forbiddenBid: number,
  difficulty: "easy" | "medium" | "hard",
  cardsInRound: number,
): number {
  // First calculate what would be the normal bid
  const normalBid = calculateHandStrength(hand, difficulty)

  // If the normal bid is the forbidden bid, adjust it
  if (normalBid === forbiddenBid) {
    // If the forbidden bid is 0, bid 1 (or the max if only 1 card)
    if (forbiddenBid === 0) {
      return 1
    }

    // If the forbidden bid is the max, bid one less
    if (forbiddenBid === cardsInRound) {
      return cardsInRound - 1
    }

    // Otherwise, decide whether to go higher or lower based on hand strength
    const handStrength = calculateRawHandStrength(hand)
    const normalizedStrength = handStrength / hand.length

    // If hand is stronger than average, bid one more
    if (normalizedStrength > 0.5) {
      return Math.min(forbiddenBid + 1, cardsInRound)
    } else {
      // Otherwise bid one less
      return Math.max(forbiddenBid - 1, 0)
    }
  }

  return normalBid
}

/**
 * Calculate a normal bid based on hand strength and difficulty
 */
function calculateNormalBid(hand: Card[], difficulty: "easy" | "medium" | "hard", gameState: GameState): number {
  // For easy difficulty, just use basic hand strength
  if (difficulty === "easy") {
    return calculateHandStrength(hand, "easy")
  }

  // For medium difficulty, consider trump cards more heavily
  if (difficulty === "medium") {
    return calculateHandStrength(hand, "medium", gameState.trumpCard?.suit)
  }

  // For hard difficulty, consider trump cards, high cards, and other players' bids
  return calculateHandStrength(hand, "hard", gameState.trumpCard?.suit, gameState)
}

/**
 * Calculate the strength of a hand and convert it to a bid
 */
function calculateHandStrength(
  hand: Card[],
  difficulty: "easy" | "medium" | "hard",
  trumpSuit?: string,
  gameState?: GameState,
): number {
  if (hand.length === 0) return 0

  let strength = 0

  // Count high cards
  const highCards = hand.filter((card) => ["A", "K", "Q", "J"].includes(card.value))

  // Count trump cards
  const trumpCards = trumpSuit ? hand.filter((card) => card.suit === trumpSuit) : []

  switch (difficulty) {
    case "easy":
      // Simple random strategy with some consideration of high cards
      strength = Math.random() * 0.5 + (highCards.length / hand.length) * 0.5
      break

    case "medium":
      // More weight to high cards and trumps
      strength = (highCards.length / hand.length) * 0.4 + (trumpCards.length / hand.length) * 0.6
      break

    case "hard":
      // Sophisticated strategy considering suit distribution
      const suitCounts = countSuits(hand)
      const hasSingletonSuits = Object.values(suitCounts).some((count) => count === 1)
      const hasVoidSuits = Object.keys(suitCounts).length < 4

      // Calculate strength based on high cards, trumps, and suit distribution
      strength =
        (highCards.length / hand.length) * 0.3 +
        (trumpCards.length / hand.length) * 0.4 +
        (hasSingletonSuits ? 0.1 : 0) +
        (hasVoidSuits ? 0.2 : 0)

      // If we have game state, consider other players' bids
      if (gameState) {
        // Adjust based on what others have bid
        const otherBids = Object.entries(gameState.bids)
          .filter(([id, bid]) => Number(id) !== gameState.dealerPosition && bid !== -1)
          .map(([_, bid]) => bid)

        if (otherBids.length > 0) {
          // If others are bidding high, slightly reduce our bid
          const avgOtherBid = otherBids.reduce((sum, bid) => sum + bid, 0) / otherBids.length
          const normalizedAvgBid = avgOtherBid / gameState.currentRound

          if (normalizedAvgBid > 0.5) {
            strength *= 0.9 // Reduce our bid slightly
          }
        }
      }
      break
  }

  // Convert strength (0-1) to a bid (0-hand.length)
  return Math.min(Math.floor(strength * (hand.length + 0.99)), hand.length)
}

/**
 * Calculate raw hand strength as a value between 0-1
 */
function calculateRawHandStrength(hand: Card[]): number {
  if (hand.length === 0) return 0

  let strength = 0

  // Count high cards and assign points
  hand.forEach((card) => {
    switch (card.value) {
      case "A":
        strength += 4
        break
      case "K":
        strength += 3
        break
      case "Q":
        strength += 2
        break
      case "J":
        strength += 1
        break
      default:
        // Give small value to high number cards
        if (["10", "9", "8"].includes(card.value)) {
          strength += 0.5
        }
    }
  })

  // Normalize to 0-1 range (assuming max possible strength is 4 points per card)
  return strength / (hand.length * 4)
}

/**
 * Count the number of cards in each suit
 */
function countSuits(hand: Card[]): Record<string, number> {
  const counts: Record<string, number> = {}

  hand.forEach((card) => {
    if (!counts[card.suit]) {
      counts[card.suit] = 0
    }
    counts[card.suit]++
  })

  return counts
}

