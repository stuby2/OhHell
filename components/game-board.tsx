"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import PokerTable from "./poker-table"
import ScoreBoard from "./score-board"
import GameOptions from "./game-options"
import DealerSelector from "./dealer-selector"
import { X, ClipboardList } from "lucide-react"
import {
  type GameState,
  type Player,
  type Card as CardType,
  createDeck,
  dealCards,
  determineRoundWinner,
  sortPlayerHand,
} from "@/lib/game-logic"
import { handleAIPlayerTurn } from "@/lib/ai-player"
import GameTutorial from "./game-tutorial"
import StrategyAnalyzer from "./strategy-analyzer"

export default function GameBoard() {
  // Core game state
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    deck: [],
    currentRound: 0,
    maxRounds: 7,
    trumpCard: null,
    currentTrick: [],
    scores: {},
    bids: {},
    tricks: {},
    currentPlayer: 0,
    dealerPosition: 0,
    phase: "setup", // setup, bidding, playing, trickComplete, roundEnd, gameEnd
    trickWinner: -1,
  })

  // Game settings
  const [numCpuPlayers, setNumCpuPlayers] = useState(3)
  const [cpuDifficulty, setCpuDifficulty] = useState("medium")
  const [optLeadWithTrump, setOptLeadWithTrump] = useState(false)
  const [autoplay, setAutoplay] = useState(true)
  const [boardColor, setBoardColor] = useState("bg-green-800")
  const [ladder, setLadder] = useState(true)
  const [maxRounds, setMaxRounds] = useState(7)

  // UI state
  const [showOptions, setShowOptions] = useState(false)
  const [showScoreboard, setShowScoreboard] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  // Change from showBidAnalyzer to showStrategyAnalyzer
  const [showStrategyAnalyzer, setShowStrategyAnalyzer] = useState(false)

  // Game tracking state
  const [forbiddenBid, setForbiddenBid] = useState<number | null>(null)
  const [trumpBroken, setTrumpBroken] = useState(false)
  const [completedRounds, setCompletedRounds] = useState(0)

  const cpuNames = ["Rube", "Marwan", "Lucille", "David", "Alice", "Tiger", "Sandra"]

  // Derived value for gameplay logic
  const canLeadWithTrump = optLeadWithTrump || trumpBroken

  // Helper functions
  const calculateMaxPossibleRounds = useCallback((numPlayers: number) => {
    return Math.floor(52 / numPlayers)
  }, [])

  const calculateTotalRounds = useCallback(() => {
    return ladder ? 2 * maxRounds - 1 : maxRounds
  }, [ladder, maxRounds])

  // Game initialization
  const startGame = useCallback(() => {
    // Shuffle the CPU names
    const shuffledNames = [...cpuNames].sort(() => Math.random() - 0.5)

    // Create players (1 human + CPU players)
    const players: Player[] = [{ id: 0, name: "You", type: "human" }]

    for (let i = 1; i <= numCpuPlayers; i++) {
      players.push({
        id: i,
        name: shuffledNames[(i - 1) % shuffledNames.length],
        type: "cpu",
        difficulty: cpuDifficulty,
      })
    }

    setGameState((prev) => ({
      ...prev,
      players,
      phase: "dealerSelection",
    }))
  }, [numCpuPlayers, cpuDifficulty, cpuNames])

  // Dealer selection handler
  const handleDealerSelected = useCallback(
    (dealerId: number) => {
      const deck = createDeck()
      const initialScores: Record<number, number> = {}
      const initialBids: Record<number, number> = {}
      const initialTricks: Record<number, number> = {}

      gameState.players.forEach((player) => {
        initialScores[player.id] = 0
        initialBids[player.id] = -1
        initialTricks[player.id] = 0
      })

      const dealerPosition = dealerId
      const firstPlayer = (dealerPosition + 1) % gameState.players.length

      setGameState((prev) => ({
        ...prev,
        deck,
        currentRound: 1,
        maxRounds: maxRounds,
        trumpCard: null,
        currentTrick: [],
        scores: initialScores,
        bids: initialBids,
        tricks: initialTricks,
        currentPlayer: firstPlayer,
        dealerPosition,
        phase: "bidding",
      }))

      setTrumpBroken(false)
      setCompletedRounds(0)

      // Deal cards for the first round
      dealRound(1, gameState.players, deck, dealerPosition)
    },
    [gameState.players, maxRounds],
  )

  // Deal cards for a round
  const dealRound = useCallback((round: number, players: Player[], deck: CardType[], dealerPosition: number) => {
    const { dealtCards, remainingDeck, trumpCard } = dealCards(players.length, round, [...deck])

    // Update player hands
    const updatedPlayers = players.map((player, index) => {
      if (player.type === "human") {
        return {
          ...player,
          hand: sortPlayerHand(dealtCards[index], trumpCard?.suit || null),
        }
      }
      return {
        ...player,
        hand: dealtCards[index],
      }
    })

    // Reset bids and tricks for the new round
    const resetBids: Record<number, number> = {}
    const resetTricks: Record<number, number> = {}

    players.forEach((player) => {
      resetBids[player.id] = -1
      resetTricks[player.id] = 0
    })

    // First player is to the left of the dealer
    const firstPlayer = (dealerPosition + 1) % players.length

    setGameState((prev) => ({
      ...prev,
      players: updatedPlayers,
      deck: remainingDeck,
      trumpCard,
      bids: resetBids,
      tricks: resetTricks,
      currentTrick: [],
      phase: "bidding",
      currentPlayer: firstPlayer,
      dealerPosition,
    }))

    setForbiddenBid(null)
    setTrumpBroken(false)
  }, [])

  // Calculate the forbidden bid for the dealer
  useEffect(() => {
    if (gameState.phase === "bidding" && gameState.players.length > 0) {
      const isLastBidder = gameState.currentPlayer === gameState.dealerPosition

      if (isLastBidder) {
        // Calculate the sum of all bids so far
        let bidSum = 0
        Object.entries(gameState.bids).forEach(([playerId, bid]) => {
          if (bid !== -1 && Number(playerId) !== gameState.dealerPosition) {
            bidSum += bid
          }
        })

        // The forbidden bid is the one that would make the total equal to the number of cards
        const cardsInRound = gameState.currentRound
        const forbidden = cardsInRound - bidSum

        // Set the forbidden bid (if it's a valid bid)
        if (forbidden >= 0 && forbidden <= cardsInRound) {
          setForbiddenBid(forbidden)
        } else {
          setForbiddenBid(null)
        }
      } else {
        setForbiddenBid(null)
      }
    }
  }, [
    gameState.phase,
    gameState.currentPlayer,
    gameState.bids,
    gameState.dealerPosition,
    gameState.currentRound,
    gameState.players.length,
  ])

  // Determine valid cards to play based on the lead suit
  const getValidCards = useCallback(
    (hand: CardType[], currentTrick: Array<CardType & { playerId: number }>) => {
      // If this is the first card in the trick
      if (currentTrick.length === 0) {
        // If leading with trump is not allowed and we have non-trump cards
        if (!canLeadWithTrump && gameState.trumpCard) {
          const nonTrumpCards = hand.filter((card) => card.suit !== gameState.trumpCard?.suit)
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
    [canLeadWithTrump, gameState.trumpCard],
  )

  // Autoplay logic - check if player has only one legal card and play it automatically
  useEffect(() => {
    if (
      autoplay &&
      gameState.phase === "playing" &&
      gameState.currentPlayer === 0 && // Human player's turn
      gameState.players.length > 0
    ) {
      const humanPlayer = gameState.players.find((p) => p.type === "human")
      if (humanPlayer && humanPlayer.hand) {
        const validCards = getValidCards(humanPlayer.hand, gameState.currentTrick)

        // If there's only one valid card, play it automatically
        if (validCards.length === 1) {
          // Add a small delay so the player can see what's happening
          const timeoutId = setTimeout(() => {
            playCard(0, validCards[0])
          }, 500)

          return () => clearTimeout(timeoutId)
        }
      }
    }
  }, [gameState, autoplay, getValidCards])

  // Place a bid
  const placeBid = useCallback(
    (playerId: number, bid: number) => {
      setGameState((prev) => {
        // Check if this is the dealer and the bid is forbidden
        if (playerId === prev.dealerPosition && bid === forbiddenBid) {
          return prev // Don't allow this bid
        }

        const newBids = { ...prev.bids, [playerId]: bid }

        // Check if all players have bid
        const allBidsPlaced = prev.players.every((player) => newBids[player.id] !== -1)

        // If all bids are placed, the first player to play is the one to the left of the dealer
        const nextPlayer = allBidsPlaced
          ? (prev.dealerPosition + 1) % prev.players.length
          : (prev.currentPlayer + 1) % prev.players.length

        return {
          ...prev,
          bids: newBids,
          currentPlayer: nextPlayer,
          phase: allBidsPlaced ? "playing" : "bidding",
        }
      })
    },
    [forbiddenBid],
  )

  // Play a card
  const playCard = useCallback(
    (playerId: number, card: CardType) => {
      setGameState((prev) => {
        // Get the player's hand before removing the card
        const playerHand = prev.players.find((p) => p.id === playerId)?.hand || []

        // Remove card from player's hand
        const updatedPlayers = prev.players.map((player) => {
          if (player.id === playerId) {
            return {
              ...player,
              hand: player.hand?.filter((c) => !(c.suit === card.suit && c.value === card.value)) || [],
            }
          }
          return player
        })

        // Add card to current trick
        const newTrick = [...prev.currentTrick, { ...card, playerId }]

        // Check if trump has been broken
        if (!trumpBroken && prev.trumpCard) {
          // Case 1: Player plays a trump card when they couldn't follow suit
          if (card.suit === prev.trumpCard.suit && prev.currentTrick.length > 0) {
            const leadSuit = prev.currentTrick[0].suit
            // If the lead suit is not trump and the player played a trump
            if (leadSuit !== prev.trumpCard.suit) {
              setTrumpBroken(true)
            }
          }
          // Case 2: Player leads with a trump card because it's the only suit they have
          else if (card.suit === prev.trumpCard.suit && prev.currentTrick.length === 0 && !optLeadWithTrump) {
            // Check if the player only had trump cards in their hand
            const nonTrumpCards = playerHand.filter((c) => c.suit !== prev.trumpCard?.suit)
            if (nonTrumpCards.length === 0 && playerHand.length > 0) {
              setTrumpBroken(true)
            }
          }
        }

        // Check if trick is complete
        if (newTrick.length === prev.players.length) {
          // Determine winner
          const winnerId = determineRoundWinner(newTrick, prev.trumpCard?.suit)

          // Update tricks won
          const newTricks = {
            ...prev.tricks,
            [winnerId]: prev.tricks[winnerId] + 1,
          }

          // First show who won the trick before clearing
          return {
            ...prev,
            players: updatedPlayers,
            currentTrick: newTrick,
            tricks: newTricks,
            phase: "trickComplete",
            trickWinner: winnerId,
          }
        }

        // Continue with next player (clockwise)
        return {
          ...prev,
          players: updatedPlayers,
          currentTrick: newTrick,
          currentPlayer: (prev.currentPlayer + 1) % prev.players.length,
        }
      })
    },
    [trumpBroken, optLeadWithTrump],
  )

  // Handle continuing after trick completion
  const handleContinueAfterTrick = useCallback(() => {
    setGameState((prev) => {
      // Check if round is over (all cards played)
      const isRoundOver = prev.players.every((player) => !player.hand || player.hand.length === 0)

      if (isRoundOver) {
        // Calculate scores
        const newScores = { ...prev.scores }

        prev.players.forEach((player) => {
          const bid = prev.bids[player.id]
          const tricks = prev.tricks[player.id]

          if (bid === tricks) {
            newScores[player.id] += 10 + bid
          }
        })

        // Track completed rounds
        const newCompletedRounds = completedRounds + 1
        setCompletedRounds(newCompletedRounds)

        // Calculate total rounds in the game
        const totalRounds = ladder ? 2 * prev.maxRounds - 1 : prev.maxRounds

        // Check if game is over
        if (newCompletedRounds >= totalRounds) {
          return {
            ...prev,
            currentTrick: [],
            phase: "gameEnd",
            currentPlayer: prev.trickWinner,
            scores: newScores,
          }
        }

        // Prepare for next round with new dealer (clockwise)
        const newDealerPosition = (prev.dealerPosition + 1) % prev.players.length

        // Determine next round number
        let nextRound

        if (ladder && newCompletedRounds >= prev.maxRounds) {
          // We're in the descending phase
          nextRound = prev.maxRounds - (newCompletedRounds - prev.maxRounds + 1)
        } else {
          // We're in the ascending phase
          nextRound = newCompletedRounds + 1
        }

        return {
          ...prev,
          currentTrick: [],
          scores: newScores,
          phase: "roundEnd",
          currentPlayer: prev.trickWinner,
          currentRound: nextRound,
          dealerPosition: newDealerPosition,
        }
      }

      // Continue with next trick, winner leads
      return {
        ...prev,
        currentTrick: [],
        phase: "playing",
        currentPlayer: prev.trickWinner,
      }
    })
  }, [completedRounds, ladder])

  // Start next round
  const nextRound = useCallback(() => {
    // Create a fresh deck for each round to ensure we have enough cards
    const freshDeck = createDeck()

    // Use the new dealer position that was already updated in the roundEnd phase
    dealRound(gameState.currentRound, gameState.players, freshDeck, gameState.dealerPosition)
  }, [gameState.currentRound, gameState.players, gameState.dealerPosition, dealRound])

  // Handle CPU actions
  useEffect(() => {
    if (
      gameState.phase === "setup" ||
      gameState.phase === "trickComplete" ||
      gameState.phase === "roundEnd" ||
      gameState.phase === "gameEnd" ||
      gameState.players.length === 0
    ) {
      return
    }

    const currentPlayer = gameState.players[gameState.currentPlayer]

    // If it's a CPU player's turn
    if (currentPlayer && currentPlayer.type === "cpu") {
      // Use the AI player logic to handle the turn
      const aiAction = () => {
        handleAIPlayerTurn({
          gameState,
          player: currentPlayer,
          forbiddenBid,
          onPlaceBid: (bid) => placeBid(currentPlayer.id, bid),
          onPlayCard: (card) => playCard(currentPlayer.id, card),
          canLeadWithTrump: canLeadWithTrump,
        })
      }

      // Add a delay for CPU actions to make the game feel more natural
      const timeoutId = setTimeout(aiAction, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [gameState, forbiddenBid, canLeadWithTrump, placeBid, playCard])

  // UI event handlers
  const toggleOptions = useCallback(() => {
    setShowOptions(!showOptions)
  }, [showOptions])

  const saveOptions = useCallback(
    (options: {
      cpuDifficulty: string
      canLeadWithTrump: boolean
      autoplay: boolean
      boardColor: string
      ladder: boolean
    }) => {
      setCpuDifficulty(options.cpuDifficulty)
      setOptLeadWithTrump(options.canLeadWithTrump)
      setAutoplay(options.autoplay)
      setBoardColor(options.boardColor)
      setLadder(options.ladder)
      setShowOptions(false)
    },
    [],
  )

  const toggleScoreboard = useCallback(() => {
    setShowScoreboard(!showScoreboard)
  }, [showScoreboard])

  const exitGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      phase: "setup",
    }))
    setShowScoreboard(false)
  }, [])

  // Handle card or bid selection
  const handleCardOrBidSelection = useCallback(
    (card: CardType) => {
      if (card.suit === "bid") {
        // Handle bid selection
        const bidValue = Number.parseInt(card.value)
        // Check if this is the dealer and the bid is forbidden
        if (gameState.currentPlayer === gameState.dealerPosition && bidValue === forbiddenBid) {
          return // Don't allow this bid
        }
        placeBid(0, bidValue)
      } else {
        // Handle card play
        playCard(0, card)
      }
    },
    [gameState.currentPlayer, gameState.dealerPosition, forbiddenBid, placeBid, playCard],
  )

  // Add a function to toggle the tutorial
  const toggleTutorial = useCallback(() => {
    setShowTutorial(!showTutorial)
  }, [showTutorial])

  // Add a function to toggle the strategy analyzer
  const toggleStrategyAnalyzer = useCallback(() => {
    setShowStrategyAnalyzer(!showStrategyAnalyzer)
  }, [showStrategyAnalyzer])

  // Render different game phases
  if (gameState.phase === "setup") {
    if (showOptions) {
      return (
        <GameOptions
          cpuDifficulty={cpuDifficulty}
          canLeadWithTrump={optLeadWithTrump}
          autoplay={autoplay}
          boardColor={boardColor}
          ladder={ladder}
          onSave={saveOptions}
          onCancel={() => setShowOptions(false)}
        />
      )
    }

    if (showTutorial) {
      return (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50">
          <GameTutorial onClose={() => setShowTutorial(false)} />
        </div>
      )
    }

    if (showStrategyAnalyzer) {
      return (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50">
          <StrategyAnalyzer
            onClose={() => setShowStrategyAnalyzer(false)}
            canLeadWithTrump={optLeadWithTrump}
            autoplay={autoplay}
          />
        </div>
      )
    }

    // Calculate the maximum possible rounds based on current number of players
    const maxPossibleRounds = calculateMaxPossibleRounds(numCpuPlayers + 1)

    return (
      <Card className="p-6 w-full max-w-2xl mx-auto">
        <div className="space-y-6 mb-6">
          <div>
            <label className="block mb-2">Number of CPUs:</label>
            <Slider
              value={[numCpuPlayers]}
              min={3}
              max={7}
              step={1}
              onValueChange={(value) => {
                setNumCpuPlayers(value[0])
                // Adjust maxRounds if needed when number of players changes
                const newMaxPossible = calculateMaxPossibleRounds(value[0] + 1)
                if (maxRounds > newMaxPossible) {
                  setMaxRounds(newMaxPossible)
                }
              }}
              className="mb-2"
            />
            <div className="flex justify-between px-2 mt-2">
              {[3, 4, 5, 6, 7].map((num) => (
                <div
                  key={num}
                  className={`flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full
                    ${numCpuPlayers === num ? "bg-blue-500 text-white" : "text-gray-600"}`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-2">Number of Rounds:</label>
            <Slider
              value={[maxRounds]}
              min={1}
              max={maxPossibleRounds}
              step={1}
              onValueChange={(value) => setMaxRounds(value[0])}
              className="mb-2"
            />
            <div className="flex justify-between mt-2 overflow-x-auto pb-2">
              {Array.from({ length: maxPossibleRounds }, (_, i) => i + 1).map((num) => (
                <div
                  key={num}
                  className={`flex items-center justify-center min-w-6 h-6 text-xs font-medium rounded-full mx-0.5
                    ${maxRounds === num ? "bg-blue-500 text-white" : "text-gray-600"}`}
                >
                  {num}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum {maxPossibleRounds} rounds possible with {numCpuPlayers + 1} players (52 card limit)
            </p>
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <Button onClick={startGame} className="w-full">
            Start Game
          </Button>
          <Button onClick={toggleOptions} variant="outline" className="w-full">
            Options
          </Button>
          <Button onClick={toggleTutorial} variant="outline" className="w-full">
            Learn to Play
          </Button>
          {/*<Button onClick={toggleStrategyAnalyzer} variant="outline" className="w-full">
            Strategy Analyzer
          </Button>*/}
        </div>
      </Card>
    )
  }

  if (gameState.phase === "dealerSelection") {
    return <DealerSelector players={gameState.players} onDealerSelected={handleDealerSelected} />
  }

  return (
    <div className="w-full space-y-6">
      <div className="relative">
        <PokerTable
          players={gameState.players}
          currentPlayer={gameState.currentPlayer}
          currentTrick={gameState.currentTrick}
          trumpCard={gameState.trumpCard}
          phase={gameState.phase}
          bids={gameState.bids}
          trickWinner={gameState.trickWinner}
          dealerPosition={gameState.dealerPosition}
          onPlayCard={handleCardOrBidSelection}
          onContinue={handleContinueAfterTrick}
          isPlayerTurn={gameState.currentPlayer === 0}
          forbiddenBid={gameState.currentPlayer === gameState.dealerPosition ? forbiddenBid : null}
          gameState={gameState}
          boardColor={boardColor}
          canLeadWithTrump={canLeadWithTrump}
          optLeadWithTrump={optLeadWithTrump}
          trumpBroken={trumpBroken}
          roundInfo={{
            currentRound: gameState.currentRound,
            totalRounds: calculateTotalRounds(),
            completedRounds: completedRounds,
          }}
        />

        {/* Scoreboard Button */}
        <Button
          onClick={toggleScoreboard}
          className="absolute bottom-4 right-4 z-40 rounded-full w-12 h-12 p-0"
          variant="secondary"
        >
          <ClipboardList className="h-6 w-6" />
        </Button>

        {/* Pop-up Scoreboard */}
        {(showScoreboard || gameState.phase === "roundEnd") && (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <div className="bg-white/95 rounded-xl shadow-2xl p-6 w-5/6 max-w-2xl mx-auto border-2 border-primary relative">
              {/* Close button */}
              {showScoreboard && gameState.phase !== "roundEnd" && (
                <Button onClick={toggleScoreboard} variant="ghost" size="icon" className="absolute top-2 right-2">
                  <X className="h-5 w-5" />
                </Button>
              )}

              <h3 className="text-2xl font-bold text-center mb-4">
                {gameState.phase === "roundEnd" ? `Round ${completedRounds} Complete!` : "Scoreboard"}
              </h3>

              <ScoreBoard
                players={gameState.players}
                scores={gameState.scores}
                bids={gameState.bids}
                tricks={gameState.tricks}
                showResults={gameState.phase === "roundEnd" || gameState.phase === "gameEnd"}
              />

              <div className="mt-6 text-center flex justify-center gap-4">
                {gameState.phase === "roundEnd" && (
                  <Button onClick={nextRound} size="lg" className="px-8">
                    Start Next Round
                  </Button>
                )}
                <Button onClick={exitGame} variant="outline" size="lg">
                  Exit Game
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Game End Pop-up */}
        {gameState.phase === "gameEnd" && (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <div className="bg-white/95 rounded-xl shadow-2xl p-6 w-5/6 max-w-2xl mx-auto border-2 border-primary">
              <h3 className="text-2xl font-bold text-center mb-4">Game Over!</h3>

              <ScoreBoard
                players={gameState.players}
                scores={gameState.scores}
                bids={gameState.bids}
                tricks={gameState.tricks}
                showResults={true}
              />

              <p className="text-xl font-bold text-center mt-6 mb-4">
                Winner:{" "}
                {Object.entries(gameState.scores).reduce(
                  (winner, [playerId, score]) => (score > winner.score ? { id: playerId, score } : winner),
                  { id: "-1", score: -1 },
                ).id !== "-1"
                  ? gameState.players.find(
                      (p) =>
                        p.id ===
                        Number.parseInt(
                          Object.entries(gameState.scores).reduce(
                            (winner, [playerId, score]) => (score > winner.score ? { id: playerId, score } : winner),
                            { id: "-1", score: -1 },
                          ).id,
                        ),
                    )?.name
                  : "Tie"}
              </p>

              <div className="mt-4 text-center flex justify-center">
                <Button onClick={exitGame} size="lg">
                  Exit Game
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

