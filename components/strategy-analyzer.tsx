"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import PlayingCard from "./playing-card"
import { X, RefreshCw, User, Monitor } from "lucide-react"
import { createDeck, type Card as CardType, type Player, sortPlayerHand, determineRoundWinner } from "@/lib/game-logic"
import { determineBid } from "@/lib/bidding-strategy"
import { determineCardToPlay } from "@/lib/play-strategy"

interface StrategyAnalyzerProps {
  onClose: () => void
  canLeadWithTrump: boolean
  autoplay: boolean
}

export default function StrategyAnalyzer({ onClose, canLeadWithTrump, autoplay }: StrategyAnalyzerProps) {
  // Game state
  const [playerHand, setPlayerHand] = useState<CardType[]>([])
  const [trumpCard, setTrumpCard] = useState<CardType | null>(null)
  const [numPlayers, setNumPlayers] = useState(4)
  const [currentRound, setCurrentRound] = useState(0)
  const [dealerPosition, setDealerPosition] = useState(3)
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [bids, setBids] = useState<Record<number, number>>({})
  const [tricks, setTricks] = useState<Record<number, number>>({})
  const [currentTrick, setCurrentTrick] = useState<Array<CardType & { playerId: number }>>([])
  const [trumpBroken, setTrumpBroken] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])

  // UI state
  const [selectedBid, setSelectedBid] = useState<number | null>(null)
  const [aiBid, setAiBid] = useState<number | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [phase, setPhase] = useState<"setup" | "bidding" | "playing" | "trickComplete" | "roundEnd">("setup")
  const [trickWinner, setTrickWinner] = useState<number>(-1)

  // Calculate total bids spoken for
  const calculateTotalBids = useCallback(() => {
    let total = 0
    Object.entries(bids).forEach(([_, bid]) => {
      if (bid !== -1) {
        total += bid
      }
    })
    return total
  }, [bids])

  // Generate a random scenario
  const generateScenario = useCallback(() => {
    // Reset previous state
    setSelectedBid(null)
    setAiBid(null)
    setShowAnalysis(false)
    setCurrentTrick([])
    setTrickWinner(-1)
    setTrumpBroken(false)

    // Randomize number of players (3-7)
    const randomNumPlayers = Math.floor(Math.random() * 5) + 3 // 3 to 7 players
    setNumPlayers(randomNumPlayers)

    // Create a fresh deck
    const deck = createDeck()

    // Determine round (1-10 cards, based on number of players)
    // Maximum cards per player is 52 / numPlayers
    const maxCards = Math.floor(52 / randomNumPlayers)
    const maxRoundSize = Math.min(maxCards, 10) // Cap at 10 for playability
    const round = Math.floor(Math.random() * maxRoundSize) + 1
    setCurrentRound(round)

    // Create players
    const newPlayers: Player[] = [{ id: 0, name: "You", type: "human" }]

    for (let i = 1; i < randomNumPlayers; i++) {
      newPlayers.push({
        id: i,
        name: `CPU ${i}`,
        type: "cpu",
        difficulty: "hard",
      })
    }

    // Deal cards to all players
    const dealtCards: Card[][] = Array(randomNumPlayers)
      .fill(null)
      .map(() => [])

    for (let i = 0; i < round; i++) {
      for (let j = 0; j < randomNumPlayers; j++) {
        if (deck.length > 0) {
          const card = deck.pop()!
          dealtCards[j].push(card)
        }
      }
    }

    // Set trump card
    const trump = deck.pop()!
    setTrumpCard(trump)

    // Sort player's hand
    const sortedHand = sortPlayerHand(dealtCards[0], trump.suit)
    setPlayerHand(sortedHand)

    // Update players with their hands
    const updatedPlayers = newPlayers.map((player, index) => {
      if (player.id === 0) {
        return { ...player, hand: sortedHand }
      } else {
        return { ...player, hand: dealtCards[index] }
      }
    })

    setPlayers(updatedPlayers)

    // Initialize bids and tricks
    const initialBids: Record<number, number> = {}
    const initialTricks: Record<number, number> = {}

    updatedPlayers.forEach((player) => {
      initialBids[player.id] = -1
      initialTricks[player.id] = 0
    })

    setBids(initialBids)
    setTricks(initialTricks)

    // Randomly decide if player is dealer
    const isDealer = Math.random() > 0.7 // 30% chance player is dealer

    if (isDealer) {
      setDealerPosition(0)

      // First player is to the left of the dealer
      setCurrentPlayer(1)

      // Some CPU players have already bid
      const randomBidCount = Math.floor(Math.random() * (randomNumPlayers - 2)) + 1

      for (let i = 1; i <= randomBidCount; i++) {
        const cpuBid = determineBid({
          player: updatedPlayers[i],
          gameState: {
            players: updatedPlayers,
            currentRound: round,
            trumpCard: trump,
            bids: initialBids,
            dealerPosition: 0,
            currentPlayer: i,
            // Other required properties with placeholder values
            deck: [],
            maxRounds: 7,
            currentTrick: [],
            scores: {},
            tricks: initialTricks,
            phase: "bidding",
            trickWinner: -1,
          },
          forbiddenBid: null,
          difficulty: "hard",
        })

        initialBids[i] = cpuBid
      }

      // Set current player to the next unbid CPU or the player
      setCurrentPlayer(randomBidCount + 1)

      if (randomBidCount + 1 >= randomNumPlayers) {
        setCurrentPlayer(0) // Back to player if all CPUs have bid
      }
    } else {
      // Random dealer position (not player)
      const randomDealerPos = Math.floor(Math.random() * (randomNumPlayers - 1)) + 1
      setDealerPosition(randomDealerPos)

      // First player is to the left of the dealer
      const firstPlayer = (randomDealerPos + 1) % randomNumPlayers

      // Random position for current player
      let randomCurrentPos

      if (Math.random() > 0.5) {
        // Player's turn to bid
        randomCurrentPos = 0
      } else {
        // Some other player's turn
        randomCurrentPos = Math.floor(Math.random() * (randomNumPlayers - 1)) + 1
      }

      setCurrentPlayer(randomCurrentPos)

      // Players before the current player have already bid
      for (let i = firstPlayer; i !== randomCurrentPos; i = (i + 1) % randomNumPlayers) {
        if (i === 0) continue // Skip player

        const cpuBid = determineBid({
          player: updatedPlayers[i],
          gameState: {
            players: updatedPlayers,
            currentRound: round,
            trumpCard: trump,
            bids: initialBids,
            dealerPosition: randomDealerPos,
            currentPlayer: i,
            // Other required properties with placeholder values
            deck: [],
            maxRounds: 7,
            currentTrick: [],
            scores: {},
            tricks: initialTricks,
            phase: "bidding",
            trickWinner: -1,
          },
          forbiddenBid: null,
          difficulty: "hard",
        })

        initialBids[i] = cpuBid
      }
    }

    setBids(initialBids)
    setPhase("bidding")
  }, [])

  // Calculate what the AI would bid
  const calculateAIBid = useCallback(() => {
    if (!playerHand.length || !trumpCard) return null

    // Create a mock game state for the AI
    const mockGameState = {
      players,
      currentRound,
      trumpCard,
      bids,
      dealerPosition,
      currentPlayer,
      // Other required properties with placeholder values
      deck: [],
      maxRounds: 7,
      currentTrick: [],
      scores: {},
      tricks,
      phase: "bidding",
      trickWinner: -1,
    }

    // Calculate forbidden bid for dealer
    let forbiddenBid = null
    if (currentPlayer === dealerPosition) {
      let bidSum = 0
      Object.entries(bids).forEach(([playerId, bid]) => {
        if (bid !== -1 && Number(playerId) !== dealerPosition) {
          bidSum += bid
        }
      })

      const forbidden = currentRound - bidSum
      if (forbidden >= 0 && forbidden <= currentRound) {
        forbiddenBid = forbidden
      }
    }

    // Use the AI bidding strategy
    const bid = determineBid({
      player: { id: 0, name: "AI", type: "cpu", difficulty: "hard", hand: playerHand },
      gameState: mockGameState,
      forbiddenBid,
      difficulty: "hard",
    })

    return bid
  }, [playerHand, trumpCard, players, numPlayers, currentRound, bids, dealerPosition, currentPlayer, tricks])

  // Handle bid selection
  const handleBidSelect = useCallback(
    (bid: number) => {
      setSelectedBid(bid)

      // Calculate what the AI would bid
      const aiBidValue = calculateAIBid()
      setAiBid(aiBidValue)

      // Show the analysis popup
      setShowAnalysis(true)

      // Update bids
      setBids((prev) => ({
        ...prev,
        [0]: bid,
      }))
    },
    [calculateAIBid],
  )

  // Calculate forbidden bid for dealer
  const getForbiddenBid = useCallback(() => {
    if (currentPlayer !== dealerPosition) return null

    let bidSum = 0
    Object.entries(bids).forEach(([playerId, bid]) => {
      if (bid !== -1 && Number(playerId) !== dealerPosition) {
        bidSum += bid
      }
    })

    const forbidden = currentRound - bidSum
    if (forbidden >= 0 && forbidden <= currentRound) {
      return forbidden
    }

    return null
  }, [currentPlayer, dealerPosition, bids, currentRound])

  // Close the analysis popup and continue with the game
  const closeAnalysis = () => {
    setShowAnalysis(false)
    continueWithGame()
  }

  // Continue with the game after bidding
  const continueWithGame = useCallback(() => {
    // First complete the bidding phase if needed
    if (phase === "bidding") {
      const newBids = { ...bids }
      let nextPlayer = (currentPlayer + 1) % numPlayers
      let allBidsPlaced = true

      // Complete CPU bids
      while (nextPlayer !== 0 && newBids[nextPlayer] === -1) {
        // Calculate forbidden bid for dealer
        let forbiddenBid = null
        if (nextPlayer === dealerPosition) {
          let bidSum = 0
          Object.entries(newBids).forEach(([playerId, bid]) => {
            if (bid !== -1 && Number(playerId) !== dealerPosition) {
              bidSum += bid
            }
          })

          const forbidden = currentRound - bidSum
          if (forbidden >= 0 && forbidden <= currentRound) {
            forbiddenBid = forbidden
          }
        }

        // Get CPU bid
        const cpuBid = determineBid({
          player: players[nextPlayer],
          gameState: {
            players,
            currentRound,
            trumpCard,
            bids: newBids,
            dealerPosition,
            currentPlayer: nextPlayer,
            deck: [],
            maxRounds: 7,
            currentTrick: [],
            scores: {},
            tricks,
            phase: "bidding",
            trickWinner: -1,
          },
          forbiddenBid,
          difficulty: "hard",
        })

        newBids[nextPlayer] = cpuBid
        nextPlayer = (nextPlayer + 1) % numPlayers
      }

      // Check if all bids are placed
      allBidsPlaced = Object.values(newBids).every((bid) => bid !== -1)

      // Update bids
      setBids(newBids)

      // Move to playing phase if all bids are placed
      if (allBidsPlaced) {
        setPhase("playing")
        // First player is to the left of the dealer
        setCurrentPlayer((dealerPosition + 1) % numPlayers)
      }
    }
  }, [phase, bids, currentPlayer, numPlayers, dealerPosition, players, currentRound, trumpCard, tricks])

  // Handle playing a card
  const handlePlayCard = useCallback(
    (card: CardType) => {
      if (phase !== "playing" || currentPlayer !== 0) return

      // Remove card from player's hand
      const updatedHand = playerHand.filter((c) => !(c.suit === card.suit && c.value === card.value))
      setPlayerHand(updatedHand)

      // Update players
      const updatedPlayers = players.map((player) => {
        if (player.id === 0) {
          return {
            ...player,
            hand: updatedHand,
          }
        }
        return player
      })
      setPlayers(updatedPlayers)

      // Add card to current trick
      const newTrick = [...currentTrick, { ...card, playerId: 0 }]
      setCurrentTrick(newTrick)

      // Check if trump has been broken
      if (!trumpBroken && trumpCard && card.suit === trumpCard.suit && currentTrick.length > 0) {
        const leadSuit = currentTrick[0].suit
        if (leadSuit !== trumpCard.suit) {
          setTrumpBroken(true)
        }
      }

      // Move to next player
      const nextPlayer = (currentPlayer + 1) % numPlayers
      setCurrentPlayer(nextPlayer)

      // Process CPU turns
      processCPUTurns(updatedPlayers, newTrick, nextPlayer)
    },
    [phase, currentPlayer, playerHand, players, currentTrick, trumpBroken, trumpCard, numPlayers],
  )

  // Process CPU turns
  const processCPUTurns = useCallback(
    (currentPlayers, trick, startPlayer) => {
      const currentTrickCopy = [...trick]
      let currentPlayerCopy = startPlayer
      let updatedPlayers = [...currentPlayers]

      // Process each CPU player's turn
      while (currentPlayerCopy !== 0 && currentTrickCopy.length < numPlayers) {
        const cpuPlayer = updatedPlayers[currentPlayerCopy]

        if (!cpuPlayer.hand || cpuPlayer.hand.length === 0) {
          // Skip if player has no cards
          currentPlayerCopy = (currentPlayerCopy + 1) % numPlayers
          continue
        }

        // Determine which card to play
        const cardToPlay = determineCardToPlay({
          player: cpuPlayer,
          gameState: {
            players: updatedPlayers,
            currentRound,
            trumpCard,
            bids,
            dealerPosition,
            currentPlayer: currentPlayerCopy,
            currentTrick: currentTrickCopy,
            deck: [],
            maxRounds: 7,
            scores: {},
            tricks,
            phase: "playing",
            trickWinner: -1,
          },
          difficulty: "hard",
          canLeadWithTrump: canLeadWithTrump || trumpBroken,
        })

        if (cardToPlay) {
          // Remove card from CPU's hand
          const updatedCpuHand = cpuPlayer.hand.filter(
            (c) => !(c.suit === cardToPlay.suit && c.value === cardToPlay.value),
          )

          // Update player
          updatedPlayers = updatedPlayers.map((player) => {
            if (player.id === cpuPlayer.id) {
              return {
                ...player,
                hand: updatedCpuHand,
              }
            }
            return player
          })

          // Add card to trick
          currentTrickCopy.push({ ...cardToPlay, playerId: cpuPlayer.id })

          // Check if trump has been broken
          if (!trumpBroken && trumpCard && cardToPlay.suit === trumpCard.suit && trick.length > 0) {
            const leadSuit = trick[0].suit
            if (leadSuit !== trumpCard.suit) {
              setTrumpBroken(true)
            }
          }
        }

        // Move to next player
        currentPlayerCopy = (currentPlayerCopy + 1) % numPlayers
      }

      // Update state with the results
      setPlayers(updatedPlayers)
      setCurrentTrick(currentTrickCopy)

      // Check if trick is complete
      if (currentTrickCopy.length === numPlayers) {
        // Determine winner
        const winnerId = determineRoundWinner(currentTrickCopy, trumpCard?.suit)
        setTrickWinner(winnerId)

        // Update tricks won
        setTricks((prev) => ({
          ...prev,
          [winnerId]: (prev[winnerId] || 0) + 1,
        }))

        // Move to trick complete phase
        setPhase("trickComplete")

        // Automatically continue after a delay
        setTimeout(() => {
          // Clear current trick
          setCurrentTrick([])

          // Check if round is over
          const isRoundOver = updatedPlayers.every((player) => !player.hand || player.hand.length === 0)

          if (isRoundOver) {
            setPhase("roundEnd")
          } else {
            // Continue with next trick, winner leads
            setPhase("playing")
            setCurrentPlayer(winnerId)
          }
        }, 2000)
      } else {
        // Continue with the next player
        setCurrentPlayer(currentPlayerCopy)
      }
    },
    [numPlayers, currentRound, trumpCard, bids, dealerPosition, tricks, canLeadWithTrump, trumpBroken],
  )

  // Get valid cards to play
  const getValidCards = useCallback(
    (hand: CardType[]) => {
      if (!hand || hand.length === 0 || phase !== "playing") return []

      // If this is the first card in the trick
      if (currentTrick.length === 0) {
        // If leading with trump is not allowed and we have non-trump cards
        if (!canLeadWithTrump && !trumpBroken && trumpCard) {
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
      const cardsInSuit = hand.filter((card) => card.suit === leadSuit)

      if (cardsInSuit.length > 0) {
        return cardsInSuit
      }

      // If can't follow suit, any card is valid
      return hand
    },
    [phase, currentTrick, canLeadWithTrump, trumpBroken, trumpCard],
  )

  // Autoplay logic
  useEffect(() => {
    if (autoplay && phase === "playing" && currentPlayer === 0) {
      const validCards = getValidCards(playerHand)

      // If there's only one valid card, play it automatically
      if (validCards.length === 1) {
        // Add a small delay
        const timeoutId = setTimeout(() => {
          handlePlayCard(validCards[0])
        }, 500)

        return () => clearTimeout(timeoutId)
      }
    }
  }, [phase, currentPlayer, playerHand, autoplay, getValidCards, handlePlayCard])

  // Generate a scenario on initial load
  useEffect(() => {
    generateScenario()
  }, [generateScenario])

  return (
    <Card className="p-6 w-full max-w-4xl mx-auto relative">
      <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={onClose}>
        <X className="h-5 w-5" />
      </Button>

      <h2 className="text-2xl font-bold mb-6 text-center">Strategy Analyzer</h2>

      {playerHand.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-gray-500 mb-4">Generate a random scenario to analyze</p>
          <Button onClick={generateScenario} size="lg">
            Generate Scenario
          </Button>
        </div>
      ) : (
        <div className="relative">
          {/* Game board layout similar to PokerTable */}
          <div className="bg-green-800 p-6 rounded-xl min-h-[500px] relative">
            {/* Trump card display */}
            {trumpCard && (
              <div className="absolute top-[70%] right-4 transform -translate-y-1/2 z-50">
                <div className="relative flex flex-col items-center space-y-2">
                  <div className="text-white text-xs bg-black/70 p-1 px-3 rounded">
                    Trump {!canLeadWithTrump && trumpBroken && <span className="ml-1">(Broken)</span>}
                  </div>
                  <PlayingCard card={trumpCard} disabled />

                  <div className="text-white text-xs bg-black/70 p-1 px-3 rounded mt-1">
                    Tricks spoken for: {calculateTotalBids()}/{currentRound}
                  </div>
                </div>
              </div>
            )}

            {/* Round info */}
            <div className="absolute top-2 left-4 z-50">
              <div className="text-white text-xs bg-black/70 p-1 px-3 rounded">Round: {currentRound}</div>
            </div>

            {/* Phase info */}
            <div className="absolute top-2 right-4 z-50">
              <div className="text-white text-xs bg-black/70 p-1 px-3 rounded">
                Phase: {phase.charAt(0).toUpperCase() + phase.slice(1)}
              </div>
            </div>

            {/* CPU Players */}
            <div className="absolute top-[10%] left-0 right-0 flex justify-center z-10">
              <div className="flex justify-center w-full px-2 flex-wrap">
                {players
                  .filter((p) => p.id !== 0)
                  .map((player) => {
                    const isCurrentPlayer = currentPlayer === player.id
                    const isDealer = dealerPosition === player.id
                    const isWinner = trickWinner === player.id && phase === "trickComplete"
                    const playedCard = currentTrick.find((card) => card.playerId === player.id)

                    return (
                      <div key={player.id} className="flex flex-col items-center mx-2 mb-2">
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
                            <div className="text-xs mt-0.5 bg-black/70 px-2 py-0.5 rounded-full">
                              Bid: {bids[player.id]}
                            </div>
                          )}
                          <div className="text-xs mt-0.5 bg-black/70 px-2 py-0.5 rounded-full">
                            Tricks: {tricks[player.id] || 0}
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
            {currentTrick.find((card) => card.playerId === 0) && (
              <div className="absolute top-[55%] left-0 right-0 flex justify-center z-20">
                <div className={`relative ${phase === "trickComplete" && trickWinner === 0 ? "animate-pulse" : ""}`}>
                  <PlayingCard
                    card={currentTrick.find((card) => card.playerId === 0)!}
                    disabled
                    className={
                      phase === "trickComplete" && trickWinner === 0 ? "shadow-[0_0_15px_5px_rgba(255,255,0,0.7)]" : ""
                    }
                  />
                </div>
              </div>
            )}

            {/* Player's hand */}
            <div className="absolute bottom-6 right-[45%] transform translate-x-1/2 flex z-30">
              {playerHand.map((card, cardIndex) => {
                const validCards = getValidCards(playerHand)
                const isValid = validCards.some((c) => c.suit === card.suit && c.value === card.value)
                const canPlay = phase === "playing" && currentPlayer === 0 && isValid

                return (
                  <div
                    key={`${card.suit}-${card.value}`}
                    className={`relative ${canPlay ? "cursor-pointer" : ""}`}
                    style={{
                      marginLeft: cardIndex > 0 ? "-30px" : "0",
                      zIndex: cardIndex,
                      transform: canPlay ? "translateY(-10px)" : "none",
                    }}
                    onClick={() => canPlay && handlePlayCard(card)}
                  >
                    <PlayingCard card={card} disabled={!canPlay} />
                    {canPlay && (
                      <div className="absolute -bottom-4 left-0 right-0 text-center text-xs text-white bg-green-600 rounded-full px-2 py-0.5 opacity-80">
                        Play
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Player info */}
            <div
              className={`absolute bottom-6 left-[35%] transform -translate-x-1/2 flex flex-col items-center p-3 rounded-full z-30
                ${currentPlayer === 0 ? "bg-yellow-300/50" : ""}
                ${trickWinner === 0 && phase === "trickComplete" ? "bg-green-500/50" : ""}
                ${currentPlayer !== 0 && trickWinner !== 0 ? "bg-green-700/70" : ""}
                text-blue-300`}
            >
              <User className="h-10 w-10" />
              <div className="text-sm font-bold mt-1 whitespace-nowrap">
                You
                {dealerPosition === 0 && <span className="ml-1">(D)</span>}
              </div>

              {/* Bid and Tricks info */}
              {bids[0] !== undefined && bids[0] !== -1 && (
                <div className="text-xs mt-1 bg-black/70 px-2 py-1 rounded-full">Bid: {bids[0]}</div>
              )}
              <div className="text-xs mt-1 bg-black/70 px-2 py-1 rounded-full">Tricks: {tricks[0] || 0}</div>
            </div>

            {/* Bidding UI */}
            {phase === "bidding" && currentPlayer === 0 && selectedBid === null && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 p-4 rounded-lg flex flex-col items-center space-y-4 z-40">
                <span className="text-white font-bold">Your Bid:</span>
                <div className="flex flex-wrap justify-center gap-2 max-w-xs">
                  {Array.from({ length: currentRound + 1 }).map((_, i) => {
                    const forbiddenBid = getForbiddenBid()
                    const isForbidden = forbiddenBid === i
                    return (
                      <button
                        key={i}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                          ${isForbidden ? "bg-red-500 text-white cursor-not-allowed opacity-50" : "bg-white text-black hover:bg-blue-200"}
                        `}
                        onClick={() => !isForbidden && handleBidSelect(i)}
                        disabled={isForbidden}
                      >
                        {i}
                      </button>
                    )
                  })}
                </div>
                {getForbiddenBid() !== null && (
                  <p className="text-yellow-300 text-sm mt-2 text-center">
                    As the dealer, you cannot bid {getForbiddenBid()}
                  </p>
                )}
              </div>
            )}

            {/* Round end info */}
            {phase === "roundEnd" && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 p-4 rounded-lg flex flex-col items-center space-y-4 z-40">
                <h3 className="text-white text-xl font-bold">Round Complete!</h3>
                <div className="bg-white p-4 rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Bid</TableHead>
                        <TableHead>Tricks</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.map((player) => {
                        const playerBid = bids[player.id]
                        const playerTricks = tricks[player.id] || 0
                        const madeContract = playerBid === playerTricks

                        return (
                          <TableRow key={player.id} className={madeContract ? "bg-green-50" : "bg-red-50"}>
                            <TableCell className="font-medium">{player.name}</TableCell>
                            <TableCell>{playerBid}</TableCell>
                            <TableCell>{playerTricks}</TableCell>
                            <TableCell>
                              <span className={madeContract ? "text-green-600 font-bold" : "text-red-600"}>
                                {madeContract ? "Made it!" : "Missed"}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <Button onClick={generateScenario} size="lg">
                  New Scenario
                </Button>
              </div>
            )}

            {/* Generate Scenario button (always visible) */}
            <Button onClick={generateScenario} className="absolute bottom-4 left-4 z-40" variant="secondary" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" /> New Scenario
            </Button>
          </div>

          {/* Bid Analysis Popup */}
          {showAnalysis && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <div className="bg-white/95 rounded-xl shadow-2xl p-6 w-5/6 max-w-md mx-auto border-2 border-primary relative">
                <Button onClick={closeAnalysis} variant="ghost" size="icon" className="absolute top-2 right-2">
                  <X className="h-5 w-5" />
                </Button>

                <h3 className="text-xl font-bold mb-4">Bid Analysis</h3>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bidder</TableHead>
                      <TableHead>Bid</TableHead>
                      <TableHead>Reasoning</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">You</TableCell>
                      <TableCell>{selectedBid}</TableCell>
                      <TableCell>Your selected bid</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">AI (Hard)</TableCell>
                      <TableCell>{aiBid}</TableCell>
                      <TableCell>
                        {aiBid !== null &&
                          (aiBid > selectedBid
                            ? "AI is more optimistic about winning tricks"
                            : aiBid < selectedBid
                              ? "AI is more conservative about winning tricks"
                              : "AI agrees with your bid")}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="mt-6 flex justify-center gap-4">
                  <Button onClick={generateScenario} variant="outline">
                    New Scenario
                  </Button>
                  <Button onClick={closeAnalysis}>Play Hand</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

