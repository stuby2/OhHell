export type CardValue = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A"
export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades"

export interface Card {
  suit: CardSuit
  value: CardValue
}

export interface Player {
  id: number
  name: string
  type: "human" | "cpu"
  difficulty?: "easy" | "medium" | "hard"
  hand?: Card[]
}

export interface GameState {
  players: Player[]
  deck: Card[]
  currentRound: number
  maxRounds: number
  trumpCard: Card | null
  currentTrick: Array<Card & { playerId: number }>
  scores: Record<number, number>
  bids: Record<number, number>
  tricks: Record<number, number>
  currentPlayer: number
  dealerPosition: number
  phase: "setup" | "bidding" | "playing" | "trickComplete" | "roundEnd" | "gameEnd"
  trickWinner: number
}

// Create a standard deck of cards
export function createDeck(): Card[] {
  const suits: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"]
  const values: CardValue[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]

  const deck: Card[] = []

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value })
    }
  }

  return shuffleDeck(deck)
}

// Shuffle the deck using Fisher-Yates algorithm
function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

// Deal cards for a round
export function dealCards(numPlayers: number, numCards: number, deck: Card[]) {
  const dealtCards: Card[][] = Array(numPlayers)
    .fill(null)
    .map(() => [])

  // Deal cards to each player
  for (let i = 0; i < numCards; i++) {
    for (let j = 0; j < numPlayers; j++) {
      if (deck.length > 0) {
        const card = deck.pop()!
        dealtCards[j].push(card)
      }
    }
  }

  // Set trump card
  const trumpCard = deck.length > 0 ? deck.pop()! : null

  return {
    dealtCards,
    remainingDeck: deck,
    trumpCard,
  }
}

// Get card value for comparison
function getCardValue(card: Card): number {
  const valueMap: Record<CardValue, number> = {
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

  return valueMap[card.value]
}

// Determine the winner of a trick
export function determineRoundWinner(trick: Array<Card & { playerId: number }>, trumpSuit?: string): number {
  if (trick.length === 0) return -1

  const leadSuit = trick[0].suit
  let winningCard = trick[0]
  let winningPlayerId = trick[0].playerId

  for (let i = 1; i < trick.length; i++) {
    const card = trick[i]

    // If this is a trump and the winning card is not a trump
    if (trumpSuit && card.suit === trumpSuit && winningCard.suit !== trumpSuit) {
      winningCard = card
      winningPlayerId = card.playerId
    }
    // If both are trumps or both are not trumps
    else if (
      (trumpSuit && card.suit === trumpSuit && winningCard.suit === trumpSuit) ||
      (card.suit === leadSuit && winningCard.suit === leadSuit)
    ) {
      if (getCardValue(card) > getCardValue(winningCard)) {
        winningCard = card
        winningPlayerId = card.playerId
      }
    }
  }

  return winningPlayerId
}

// Sort player's hand with advanced grouping by suit color and trump
export function sortPlayerHand(hand: Card[], trumpSuit: string | null): Card[] {
  if (!hand || hand.length === 0 || !trumpSuit) return hand || []

  // Define suit colors
  const suitColors: Record<CardSuit, "red" | "black"> = {
    hearts: "red",
    diamonds: "red",
    clubs: "black",
    spades: "black",
  }

  // Get the trump suit as CardSuit type
  const trump = trumpSuit as CardSuit

  // Get the color of the trump suit
  const trumpColor = suitColors[trump]

  // Determine opposite color suits
  const oppositeSuits = Object.keys(suitColors).filter(
    (suit) => suitColors[suit as CardSuit] !== trumpColor,
  ) as CardSuit[]

  // Randomly select which opposite suit goes first
  const randomIndex = Math.floor(Math.random() * 2)
  const oppositeSuit1 = oppositeSuits[randomIndex]
  const oppositeSuit2 = oppositeSuits[1 - randomIndex]

  // Determine same color suit (not trump)
  const sameColorSuit = Object.keys(suitColors).find(
    (suit) => suit !== trump && suitColors[suit as CardSuit] === trumpColor,
  ) as CardSuit

  // Group cards by suit
  const trumpCards: Card[] = []
  const oppositeSuit1Cards: Card[] = []
  const oppositeSuit2Cards: Card[] = []
  const sameColorCards: Card[] = []

  // Sort cards into their respective groups
  hand.forEach((card) => {
    if (card.suit === trump) {
      trumpCards.push(card)
    } else if (card.suit === oppositeSuit1) {
      oppositeSuit1Cards.push(card)
    } else if (card.suit === oppositeSuit2) {
      oppositeSuit2Cards.push(card)
    } else if (card.suit === sameColorSuit) {
      sameColorCards.push(card)
    }
  })

  // Sort each group by value (low to high)
  const sortByValue = (cards: Card[]): Card[] => {
    return [...cards].sort((a, b) => getCardValue(a) - getCardValue(b))
  }

  // Sort each group
  const sortedTrumpCards = sortByValue(trumpCards)
  const sortedOppositeSuit1Cards = sortByValue(oppositeSuit1Cards)
  const sortedOppositeSuit2Cards = sortByValue(oppositeSuit2Cards)
  const sortedSameColorCards = sortByValue(sameColorCards)

  // Arrange in reverse order so higher value cards are on the right for each suit
  // and trump cards are on the right side of the hand
  let arrangedHand: Card[] = []

  // Add second opposite suit if it has cards
  if (sortedOppositeSuit2Cards.length > 0 && sortedOppositeSuit1Cards.length > 0) {
    arrangedHand = arrangedHand.concat(sortedOppositeSuit2Cards)
  }

  // Add same color suit
  arrangedHand = arrangedHand.concat(sortedSameColorCards)

  // Add first opposite suit or second if first is empty
  if (sortedOppositeSuit1Cards.length > 0) {
    arrangedHand = arrangedHand.concat(sortedOppositeSuit1Cards)
  } else if (sortedOppositeSuit2Cards.length > 0 && sortedOppositeSuit1Cards.length === 0) {
    arrangedHand = arrangedHand.concat(sortedOppositeSuit2Cards)
  }

  // Add trump cards last (will appear on the right)
  arrangedHand = arrangedHand.concat(sortedTrumpCards)

  return arrangedHand
}

