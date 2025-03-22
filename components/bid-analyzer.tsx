"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import PlayingCard from "./playing-card"
import { X, RefreshCw, User } from "lucide-react"
import { createDeck, type Card as CardType, type Player, sortPlayerHand } from "@/lib/game-logic"
import { determineBid } from "@/lib/bidding-strategy"

interface BidAnalyzerProps {
  onClose: () => void
}

export default function BidAnalyzer({ onClose }: BidAnalyzerProps) {
  const [playerHand, setPlayerHand] = useState<CardType[]>([])
  const [trumpCard, setTrumpCard] = useState<CardType | null>(null)
  const [otherBids, setOtherBids] = useState<Record<number, number>>({})
  const [numPlayers, setNumPlayers] = useState(4)
  const [currentRound, setCurrentRound] = useState(0)
  const [selectedBid, setSelectedBid] = useState<number | null>(null)
  const [aiBid, setAiBid] = useState<number | null>(null)
  const [dealerPosition, setDealerPosition] = useState(3) // Player is position 0, dealer is last to bid
  const [currentPlayer, setCurrentPlayer] = useState(0) // Player's turn to bid
  const [showAnalysis, setShowAnalysis] = useState(false)

  // Calculate total bids spoken for
  const calculateTotalBids = useCallback(() => {
    let total = 0
    Object.entries(otherBids).forEach(([_, bid]) => {
      if (bid !== -1) {
        total += bid
      }
    })
    return total
  }, [otherBids])

  // Generate a random scenario
  const generateScenario = useCallback(() => {
    // Reset previous state
    setSelectedBid(null)
    setAiBid(null)
    setShowAnalysis(false)

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

    // Deal cards to player
    const playerCards = deck.splice(0, round)

    // Set trump card
    const trump = deck.splice(0, 1)[0]
    setTrumpCard(trump)

    // Sort player's hand
    const sortedHand = sortPlayerHand(playerCards, trump.suit)
    setPlayerHand(sortedHand)

    // Generate random bids for other players
    const bids: Record<number, number> = {}

    // Randomly decide if player is dealer
    const isDealer = Math.random() > 0.7 // 30% chance player is dealer

    if (isDealer) {
      setDealerPosition(0)
      setCurrentPlayer(0)

      // All other players have bid
      let totalBids = 0
      for (let i = 1; i < randomNumPlayers; i++) {
        const maxBid = Math.min(round, 5) // Limit max bid for realism
        const bid = Math.floor(Math.random() * (maxBid + 1))
        bids[i] = bid
        totalBids += bid
      }
    } else {
      setDealerPosition(randomNumPlayers - 1)

      // Random position for player (not dealer)
      const playerPosition = Math.floor(Math.random() * (randomNumPlayers - 1))
      setCurrentPlayer(playerPosition)

      // Players before the current player have already bid
      let totalBids = 0
      for (let i = 0; i < playerPosition; i++) {
        const maxBid = Math.min(round, 5) // Limit max bid for realism
        const bid = Math.floor(Math.random() * (maxBid + 1))
        bids[i] = bid
        totalBids += bid
      }

      // Players after current player (including dealer) haven't bid yet
      for (let i = playerPosition + 1; i < randomNumPlayers; i++) {
        bids[i] = -1 // -1 means no bid yet
      }
    }

    setOtherBids(bids)
  }, [])

  // Calculate what the AI would bid
  const calculateAIBid = useCallback(() => {
    if (!playerHand.length || !trumpCard) return null

    // Create a mock game state for the AI
    const mockGameState = {
      players: Array(numPlayers)
        .fill(null)
        .map((_, i) => ({
          id: i,
          name: i === 0 ? "You" : `CPU ${i}`,
          type: i === 0 ? "human" : "cpu",
        })) as Player[],
      currentRound,
      trumpCard,
      bids: otherBids,
      dealerPosition,
      // Other required properties with placeholder values
      deck: [],
      maxRounds: 7,
      currentTrick: [],
      scores: {},
      tricks: {},
      currentPlayer,
      phase: "bidding",
      trickWinner: -1,
    }

    // Calculate forbidden bid for dealer
    let forbiddenBid = null
    if (currentPlayer === dealerPosition) {
      let bidSum = 0
      Object.entries(otherBids).forEach(([playerId, bid]) => {
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
  }, [playerHand, trumpCard, numPlayers, currentRound, otherBids, dealerPosition, currentPlayer])

  // Handle bid selection
  const handleBidSelect = useCallback(
    (bid: number) => {
      setSelectedBid(bid)

      // Calculate what the AI would bid
      const aiBidValue = calculateAIBid()
      setAiBid(aiBidValue)

      // Show the analysis popup
      setShowAnalysis(true)
    },
    [calculateAIBid],
  )

  // Calculate forbidden bid for dealer
  const getForbiddenBid = useCallback(() => {
    if (currentPlayer !== dealerPosition) return null

    let bidSum = 0
    Object.entries(otherBids).forEach(([playerId, bid]) => {
      if (bid !== -1 && Number(playerId) !== dealerPosition) {
        bidSum += bid
      }
    })

    const forbidden = currentRound - bidSum
    if (forbidden >= 0 && forbidden <= currentRound) {
      return forbidden
    }

    return null
  }, [currentPlayer, dealerPosition, otherBids, currentRound])

  const forbiddenBid = getForbiddenBid()

  // Close the analysis popup
  const closeAnalysis = () => {
    setShowAnalysis(false)
  }

  // Generate a scenario on initial load
  useEffect(() => {
    generateScenario()
  }, [generateScenario])

  return (
    <Card className="p-6 w-full max-w-4xl mx-auto relative">
      <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={onClose}>
        <X className="h-5 w-5" />
      </Button>

      <h2 className="text-2xl font-bold mb-6 text-center">Bid Analyzer</h2>

      {playerHand.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-gray-500 mb-4">Generate a random bidding scenario to analyze</p>
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
                  <div className="text-white text-xs bg-black/70 p-1 px-3 rounded">Trump</div>
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

            {/* CPU Players */}
            <div className="absolute top-[10%] left-0 right-0 flex justify-center z-10">
              <div className="flex justify-center w-full px-2 flex-wrap">
                {Array.from({ length: numPlayers - 1 }).map((_, i) => {
                  const playerId = i + 1 // CPU players start at ID 1
                  const isDealer = dealerPosition === playerId

                  return (
                    <div key={playerId} className="flex flex-col items-center mx-2 mb-2">
                      <div className="flex flex-col items-center p-1.5 rounded-full z-10 bg-gray-800/30 text-gray-300">
                        <div className="h-7 w-7 bg-gray-700 rounded-full flex items-center justify-center">
                          <span className="text-xs">CPU</span>
                        </div>
                        <div className="text-xs font-bold mt-0.5 whitespace-nowrap text-center">
                          Player {playerId}
                          {isDealer && <span className="ml-1">(D)</span>}
                        </div>

                        {/* Bid info */}
                        {otherBids[playerId] !== undefined && (
                          <div className="text-xs mt-0.5 bg-black/70 px-2 py-0.5 rounded-full">
                            {otherBids[playerId] === -1 ? "No bid yet" : `Bid: ${otherBids[playerId]}`}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Player's hand */}
            <div className="absolute bottom-6 right-[45%] transform translate-x-1/2 flex z-30">
              {playerHand.map((card, cardIndex) => (
                <div
                  key={`${card.suit}-${card.value}`}
                  className="relative cursor-pointer"
                  style={{
                    marginLeft: cardIndex > 0 ? "-30px" : "0", // Less overlap for better visibility
                    zIndex: cardIndex, // Stack cards
                  }}
                >
                  <PlayingCard card={card} disabled={true} />
                </div>
              ))}
            </div>

            {/* Player info */}
            <div className="absolute bottom-6 left-[35%] transform -translate-x-1/2 flex flex-col items-center p-3 rounded-full bg-green-700/70 z-30 text-blue-300">
              <User className="h-10 w-10" />
              <div className="text-sm font-bold mt-1 whitespace-nowrap">
                You
                {dealerPosition === 0 && <span className="ml-1">(D)</span>}
              </div>

              {/* Bid info if already selected */}
              {selectedBid !== null && !showAnalysis && (
                <div className="text-xs mt-1 bg-black/70 px-2 py-1 rounded-full">Bid: {selectedBid}</div>
              )}
            </div>

            {/* Bidding UI */}
            {selectedBid === null && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 p-4 rounded-lg flex flex-col items-center space-y-4 z-40">
                <span className="text-white font-bold">Your Bid:</span>
                <div className="flex flex-wrap justify-center gap-2 max-w-xs">
                  {Array.from({ length: currentRound + 1 }).map((_, i) => {
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
                {forbiddenBid !== null && (
                  <p className="text-yellow-300 text-sm mt-2 text-center">
                    As the dealer, you cannot bid {forbiddenBid}
                  </p>
                )}
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

                <div className="mt-6 flex justify-center">
                  <Button onClick={closeAnalysis}>Close Analysis</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

