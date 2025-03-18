import type { GameState, Player, Card } from "@/lib/game-logic"

interface PlayStrategyProps {
  player: Player
  gameState: GameState
  difficulty: "easy" | "medium" | "hard"
  canLeadWithTrump: boolean
}

/**
 * Determines which card an AI player should play based on the current game state
 */
export function determineCardToPlay({
  player,
  gameState,
  difficulty,
  canLeadWithTrump,
}: PlayStrategyProps): Card | null {
  const hand = player.hand || []
  if (hand.length === 0) return null

  const currentTrick = gameState.currentTrick
  const trumpSuit = gameState.trumpCard?.suit

  // If this is the first card in the trick
  if (currentTrick.length === 0) {
    return determineLeadCard(hand, trumpSuit, difficulty, gameState, canLeadWithTrump, player)
  }

  // If we need to follow suit
  const leadSuit = currentTrick[0].suit
  const cardsInSuit = hand.filter((card) => card.suit === leadSuit)

  if (cardsInSuit.length > 0) {
    return determineFollowCard(cardsInSuit, currentTrick, trumpSuit, difficulty, gameState, player)
  }

  // If we can't follow suit, decide whether to trump or discard
  return determineDiscardOrTrump(hand, currentTrick, trumpSuit, difficulty, gameState, player)
}

/**
 * Determine which card to lead (first card in a trick)
 */
function determineLeadCard(
  hand: Card[],
  trumpSuit: string | undefined,
  difficulty: "easy" | "medium" | "hard",
  gameState: GameState,
  canLeadWithTrump: boolean,
  player: Player,
): Card {
  // Get non-trump cards if we shouldn't lead with trump
  const nonTrumpCards = trumpSuit && !canLeadWithTrump ? hand.filter((card) => card.suit !== trumpSuit) : hand

  // If we have no non-trump cards, we have to use a trump
  const playableCards = nonTrumpCards.length > 0 ? nonTrumpCards : hand

  switch (difficulty) {
    case "easy":
      // Random card for easy difficulty
      return playableCards[Math.floor(Math.random() * playableCards.length)]

    case "medium": {
      // Lead with highest non-trump card for medium difficulty
      const sortedByValue = [...playableCards].sort((a, b) => getCardValue(b) - getCardValue(a))
      return sortedByValue[0]
    }

    case "hard": {
      // For hard difficulty, consider our bid and tricks taken
      const playerBid = gameState.bids[player.id] || 0
      const playerTricks = gameState.tricks[player.id] || 0
      const tricksNeeded = playerBid - playerTricks

      // If we need more tricks, lead with a strong card
      if (tricksNeeded > 0) {
        const sortedByStrength = [...playableCards].sort(
          (a, b) => getCardStrength(b, trumpSuit) - getCardStrength(a, trumpSuit),
        )
        return sortedByStrength[0]
      }

      // If we've made our bid, lead with a weak card
      if (tricksNeeded <= 0) {
        const sortedByStrength = [...playableCards].sort(
          (a, b) => getCardStrength(a, trumpSuit) - getCardStrength(b, trumpSuit),
        )
        return sortedByStrength[0]
      }

      // Fallback to medium strategy
      const sortedByValue = [...playableCards].sort((a, b) => getCardValue(b) - getCardValue(a))
      return sortedByValue[0]
    }

    default:
      return playableCards[0]
  }
}

/**
 * Determine which card to play when following suit
 */
function determineFollowCard(
  cardsInSuit: Card[],
  currentTrick: Array<Card & { playerId: number }>,
  trumpSuit: string | undefined,
  difficulty: "easy" | "medium" | "hard",
  gameState: GameState,
  player: Player,
): Card {
  switch (difficulty) {
    case "easy":
      // Random card for easy difficulty
      return cardsInSuit[Math.floor(Math.random() * cardsInSuit.length)]

    case "medium": {
      // Find the highest card played so far
      const highestCardPlayed = findHighestCard(currentTrick, trumpSuit)

      // If we can beat it, play the lowest card that can win
      const winningCards = cardsInSuit.filter(
        (card) => getCardStrength(card, trumpSuit) > getCardStrength(highestCardPlayed, trumpSuit),
      )

      if (winningCards.length > 0) {
        // Play the lowest winning card
        return winningCards.sort((a, b) => getCardValue(a) - getCardValue(b))[0]
      }

      // If we can't win, play the lowest card
      return cardsInSuit.sort((a, b) => getCardValue(a) - getCardValue(b))[0]
    }

    case "hard": {
      // For hard difficulty, consider our bid and tricks taken
      const playerBid = gameState.bids[player.id] || 0
      const playerTricks = gameState.tricks[player.id] || 0
      const tricksNeeded = playerBid - playerTricks

      // Find the highest card played so far
      const highestCardPlayed = findHighestCard(currentTrick, trumpSuit)

      // If we need more tricks and can win, play the lowest card that can win
      if (tricksNeeded > 0) {
        const winningCards = cardsInSuit.filter(
          (card) => getCardStrength(card, trumpSuit) > getCardStrength(highestCardPlayed, trumpSuit),
        )

        if (winningCards.length > 0) {
          // Play the lowest winning card
          return winningCards.sort((a, b) => getCardValue(a) - getCardValue(b))[0]
        }
      }

      // If we've made our bid or can't win, play the lowest card
      return cardsInSuit.sort((a, b) => getCardValue(a) - getCardValue(b))[0]
    }

    default:
      return cardsInSuit[0]
  }
}

/**
 * Determine whether to trump or discard when can't follow suit
 */
function determineDiscardOrTrump(
  hand: Card[],
  currentTrick: Array<Card & { playerId: number }>,
  trumpSuit: string | undefined,
  difficulty: "easy" | "medium" | "hard",
  gameState: GameState,
  player: Player,
): Card {
  // Get trump cards in hand
  const trumpCards = trumpSuit ? hand.filter((card) => card.suit === trumpSuit) : []

  // Get non-trump cards for discarding
  const discardCards = hand.filter((card) => card.suit !== trumpSuit)

  switch (difficulty) {
    case "easy":
      // Random card for easy difficulty
      return hand[Math.floor(Math.random() * hand.length)]

    case "medium": {
      // Check if someone has already played a trump
      const trumpPlayed = currentTrick.some((card) => card.suit === trumpSuit)

      // If we have trump cards and no trump has been played, play lowest trump
      if (trumpCards.length > 0 && !trumpPlayed) {
        return trumpCards.sort((a, b) => getCardValue(a) - getCardValue(b))[0]
      }

      // If trump has been played or we have no trumps, discard lowest card
      const lowestCard = hand.sort((a, b) => getCardValue(a) - getCardValue(b))[0]
      return lowestCard
    }

    case "hard": {
      // For hard difficulty, consider our bid and tricks taken
      const playerBid = gameState.bids[player.id] || 0
      const playerTricks = gameState.tricks[player.id] || 0
      const tricksNeeded = playerBid - playerTricks

      // Find the highest card played so far
      const highestCardPlayed = findHighestCard(currentTrick, trumpSuit)
      const isHighestTrump = highestCardPlayed.suit === trumpSuit

      // If we need more tricks
      if (tricksNeeded > 0) {
        // If we have trump cards
        if (trumpCards.length > 0) {
          // If no trump has been played or we can beat the highest trump
          if (!isHighestTrump || trumpCards.some((card) => getCardValue(card) > getCardValue(highestCardPlayed))) {
            // Play the lowest trump that can win
            const winningTrumps = isHighestTrump
              ? trumpCards.filter((card) => getCardValue(card) > getCardValue(highestCardPlayed))
              : trumpCards

            return winningTrumps.sort((a, b) => getCardValue(a) - getCardValue(b))[0]
          }
        }
      }

      // If we've made our bid or can't win, discard highest card from shortest suit
      const suitCounts = countSuits(hand)
      const shortestSuit = Object.entries(suitCounts)
        .filter(([suit]) => suit !== trumpSuit) // Don't discard trumps if possible
        .sort(([, countA], [, countB]) => countA - countB)[0]?.[0]

      if (shortestSuit) {
        const cardsInShortestSuit = hand.filter((card) => card.suit === shortestSuit)
        return cardsInShortestSuit.sort((a, b) => getCardValue(b) - getCardValue(a))[0]
      }

      // Fallback to discarding highest non-trump
      if (discardCards.length > 0) {
        return discardCards.sort((a, b) => getCardValue(b) - getCardValue(a))[0]
      }

      // Last resort: discard lowest trump
      return hand.sort((a, b) => getCardValue(a) - getCardValue(b))[0]
    }

    default:
      return hand[0]
  }
}

/**
 * Find the highest card in the trick
 */
function findHighestCard(trick: Array<Card & { playerId: number }>, trumpSuit?: string): Card {
  if (trick.length === 0) {
    throw new Error("Cannot find highest card in empty trick")
  }

  const leadSuit = trick[0].suit
  let highestCard = trick[0]

  for (let i = 1; i < trick.length; i++) {
    const card = trick[i]

    // If this is a trump and the highest card is not a trump
    if (trumpSuit && card.suit === trumpSuit && highestCard.suit !== trumpSuit) {
      highestCard = card
    }
    // If both are trumps or both are not trumps
    else if (
      (trumpSuit && card.suit === trumpSuit && highestCard.suit === trumpSuit) ||
      (card.suit === leadSuit && highestCard.suit === leadSuit)
    ) {
      if (getCardValue(card) > getCardValue(highestCard)) {
        highestCard = card
      }
    }
  }

  return highestCard
}

/**
 * Get the numeric value of a card
 */
function getCardValue(card: Card): number {
  const valueMap: Record<string, number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  }

  return valueMap[card.value] || 0
}

/**
 * Get the overall strength of a card considering trump
 */
function getCardStrength(card: Card, trumpSuit?: string): number {
  // Trump cards are stronger than any non-trump
  if (trumpSuit && card.suit === trumpSuit) {
    return getCardValue(card) + 100 // Add a high value to ensure trumps are stronger
  }

  return getCardValue(card)
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

