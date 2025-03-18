"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import PokerTable from "./poker-table"
import ScoreBoard from "./score-board"
import GameOptions from "./game-options"
import { X, ClipboardList } from "lucide-react"
import {
  type GameState,
  type Player,
  type Card as CardType,
  createDeck,
  dealCards,
  determineRoundWinner,
} from "@/lib/game-logic"
import { handleAIPlayerTurn } from "@/lib/ai-player"

export default function GameBoard() {
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

  const [numCpuPlayers, setNumCpuPlayers] = useState(3)
  const [cpuDifficulty, setCpuDifficulty] = useState("medium")
  const [canLeadWithTrump, setCanLeadWithTrump] = useState(false)
  const [autoplay, setAutoplay] = useState(true)
  const [boardColor, setBoardColor] = useState("bg-green-800")
  const [showOptions, setShowOptions] = useState(false)
  const [forbiddenBid, setForbiddenBid] = useState<number | null>(null)
  const [showScoreboard, setShowScoreboard] = useState(false)
  const [trumpBroken, setTrumpBroken] = useState(false)
  const [maxRounds, setMaxRounds] = useState(7)
  const [ladder, setLadder] = useState(true)
  const [completedRounds, setCompletedRounds] = useState(0)

  const cpuNames = ["Rube", "Marwan", "Lucille", "David", "Alice", "Tiger", "Sandra"]

  useEffect(() => {
    console.log("Trump broken state changed:", trumpBroken)
  }, [trumpBroken])

  const calculateMaxPossibleRounds = (numPlayers: number) => {
    // Leaving a bug here, if players = 4 and 13 rounds selected then
    // no trump in final round. Game logic works but CPU issues.
    const maxRounds = Math.floor(52 / numPlayers)
    return maxRounds
  }

  const calculateTotalRounds = () => {
    if (ladder) {
      return 2 * maxRounds - 1
    }
    return maxRounds
  }

  const startGame = () => {
    // Shuffle the CPU names
    const shuffledNames = [...cpuNames].sort(() => Math.random() - 0.5)

    // Create players (1 human + CPU players)
    const players: Player[] = [{ id: 0, name: "You", type: "human" }]

    for (let i = 1; i <= numCpuPlayers; i++) {
      players.push({
        id: i,
        name: shuffledNames[(i - 1) % shuffledNames.length], // Use shuffled names
        type: "cpu",
        difficulty: cpuDifficulty,
      })
    }

    // Initialize game state
    const deck = createDeck()
    const initialScores: Record<number, number> = {}
    const initialBids: Record<number, number> = {}
    const initialTricks: Record<number, number> = {}

    players.forEach((player) => {
      initialScores[player.id] = 0
      initialBids[player.id] = -1
      initialTricks[player.id] = 0
    })

    // Start with dealer at position 0 (human player)
    // First player to bid/play will be position 1 (to the left of dealer)
    const dealerPosition = 0
    const firstPlayer = (dealerPosition + 1) % players.length

    setGameState({
      players,
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
      trickWinner: -1,
    })

    // Reset trump broken state for new game
    setTrumpBroken(false)

    // Reset completed rounds counter
    setCompletedRounds(0)

    // Deal cards for the first round
    dealRound(1, players, deck, dealerPosition)
  }

  const dealRound = (round: number, players: Player[], deck: CardType[], dealerPosition: number) => {
    const { dealtCards, remainingDeck, trumpCard } = dealCards(players.length, round, [...deck])

    // Update player hands
    const updatedPlayers = players.map((player, index) => ({
      ...player,
      hand: dealtCards[index],
    }))

    // Reset bids and tricks for the new round
    const resetBids: Record<number, number> = {}
    const resetTricks: Record<number, number> = {}

    players.forEach((player) => {
      resetBids[player.id] = -1
      resetTricks[player.id] = 0
    })

    // First player is to the left of the dealer (clockwise)
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

    // Reset forbidden bid
    setForbiddenBid(null)

    // Reset trump broken state for new round
    setTrumpBroken(false)
  }

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
  const getValidCards = (hand: CardType[], currentTrick: Array<CardType & { playerId: number }>) => {
    // If this is the first card in the trick
    if (currentTrick.length === 0) {
      // If leading with trump is not allowed and trump hasn't been broken
      // and we have non-trump cards
      if (!canLeadWithTrump && !trumpBroken && gameState.trumpCard) {
        const nonTrumpCards = hand.filter((card) => card.suit !== gameState.trumpCard?.suit)
        // If we have non-trump cards, only those are valid
        if (nonTrumpCards.length > 0) {
          console.log("Restricting lead to non-trump cards:", nonTrumpCards.length, "cards available")
          return nonTrumpCards
        } else {
          console.log("Only trump cards available for lead - trump will be broken")
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
  }

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
  }, [gameState, autoplay, trumpBroken])

  const placeBid = (playerId: number, bid: number) => {
    setGameState((prev) => {
      // Check if this is the dealer and the bid is forbidden
      if (playerId === prev.dealerPosition && bid === forbiddenBid) {
        // Don't allow this bid
        return prev
      }

      const newBids = { ...prev.bids, [playerId]: bid }

      // Check if all players have bid
      const allBidsPlaced = prev.players.every((player) => newBids[player.id] !== -1)

      // If all bids are placed, the first player to play is the one to the left of the dealer (clockwise)
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
  }

  const playCard = (playerId: number, card: CardType) => {
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
            console.log("Trump broken: Player played trump when couldn't follow suit")
            setTrumpBroken(true)
            console.log("canLeadWithTrump: ", canLeadWithTrump)
            console.log("trumpBroken: ", trumpBroken)
          }
        }

        // Case 2: Player leads with a trump card because it's the only suit they have
        else if (card.suit === prev.trumpCard.suit && prev.currentTrick.length === 0 && !canLeadWithTrump) {
          // Check if the player only had trump cards in their hand
          const nonTrumpCards = playerHand.filter((c) => c.suit !== prev.trumpCard?.suit)
          if (nonTrumpCards.length === 0 && playerHand.length > 0) {
            console.log("Trump broken: Player led with trump because it's the only suit they have")
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
  }

  // Handle continuing after trick completion (when user clicks)
  const handleContinueAfterTrick = () => {
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
  }

  const nextRound = () => {
    // Create a fresh deck for each round to ensure we have enough cards
    const freshDeck = createDeck()

    // Use the new dealer position that was already updated in the roundEnd phase
    dealRound(gameState.currentRound, gameState.players, freshDeck, gameState.dealerPosition)
  }

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
          canLeadWithTrump: canLeadWithTrump || trumpBroken,
        })
      }

      // Add a delay for CPU actions to make the game feel more natural
      const timeoutId = setTimeout(aiAction, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [gameState, forbiddenBid, canLeadWithTrump, trumpBroken])

  // Toggle options view
  const toggleOptions = () => {
    setShowOptions(!showOptions)
  }

  // Save options and return to main menu
  const saveOptions = (options: {
    cpuDifficulty: string
    canLeadWithTrump: boolean
    autoplay: boolean
    boardColor: string
    ladder: boolean
  }) => {
    setCpuDifficulty(options.cpuDifficulty)
    setCanLeadWithTrump(options.canLeadWithTrump)
    setAutoplay(options.autoplay)
    setBoardColor(options.boardColor)
    setLadder(options.ladder)
    setShowOptions(false)
  }

  // Toggle scoreboard visibility
  const toggleScoreboard = () => {
    setShowScoreboard(!showScoreboard)
  }

  // Exit game (return to main menu)
  const exitGame = () => {
    setGameState({
      ...gameState,
      phase: "setup",
    })
    setShowScoreboard(false)
  }

  // Render different game phases
  if (gameState.phase === "setup") {
    if (showOptions) {
      return (
        <GameOptions
          cpuDifficulty={cpuDifficulty}
          canLeadWithTrump={canLeadWithTrump}
          autoplay={autoplay}
          boardColor={boardColor}
          ladder={ladder}
          onSave={saveOptions}
          onCancel={() => setShowOptions(false)}
        />
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
            <span className="block text-center">{numCpuPlayers}</span>
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
            <div className="flex justify-between text-sm">
              <span>1</span>
              <span>{maxRounds}</span>
              <span>{maxPossibleRounds}</span>
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
        </div>
      </Card>
    )
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
          onPlayCard={(card) => {
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
          }}
          onContinue={handleContinueAfterTrick}
          isPlayerTurn={gameState.currentPlayer === 0}
          forbiddenBid={gameState.currentPlayer === gameState.dealerPosition ? forbiddenBid : null}
          gameState={gameState}
          boardColor={boardColor}
          canLeadWithTrump={canLeadWithTrump || trumpBroken}
          trumpBroken={trumpBroken}
          roundInfo={{
            currentRound: gameState.currentRound,
            totalRounds: ladder ? 2 * gameState.maxRounds - 1 : gameState.maxRounds,
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
                {gameState.phase === "roundEnd" ? `Round ${gameState.currentRound - 1} Complete!` : "Scoreboard"}
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

