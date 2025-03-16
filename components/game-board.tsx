"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import PokerTable from "./poker-table"
import ScoreBoard from "./score-board"
import GameOptions from "./game-options"
import {
  type GameState,
  type Player,
  type Card as CardType,
  createDeck,
  dealCards,
  determineRoundWinner,
} from "@/lib/game-logic"

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
  const [canLeadWithTrump, setCanLeadWithTrump] = useState(true)
  const [showOptions, setShowOptions] = useState(false)

  const startGame = () => {
    // Create players (1 human + CPU players)
    const players: Player[] = [{ id: 0, name: "You", type: "human" }]

    for (let i = 1; i <= numCpuPlayers; i++) {
      players.push({
        id: i,
        name: `CPU ${i}`,
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
      maxRounds: 7,
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
  }

  const placeBid = (playerId: number, bid: number) => {
    setGameState((prev) => {
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
  }

  const playCard = (playerId: number, card: CardType) => {
    setGameState((prev) => {
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

      // Continue with next player
      return {
        ...prev,
        players: updatedPlayers,
        currentTrick: newTrick,
        currentPlayer: (prev.currentPlayer + 1) % prev.players.length,
      }
    })
  }

  // Handle trick completion after delay
  useEffect(() => {
    if (gameState.phase === "trickComplete") {
      const timeoutId = setTimeout(() => {
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

            // Check if game is over
            if (prev.currentRound === prev.maxRounds) {
              return {
                ...prev,
                currentTrick: [],
                phase: "gameEnd",
                currentPlayer: prev.trickWinner,
              }
            }

            // Prepare for next round with new dealer
            const newDealerPosition = (prev.dealerPosition + 1) % prev.players.length

            return {
              ...prev,
              currentTrick: [],
              scores: newScores,
              phase: "roundEnd",
              currentPlayer: prev.trickWinner,
              currentRound: prev.currentRound + 1,
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
      }, 2000) // 2 second delay

      return () => clearTimeout(timeoutId)
    }
  }, [gameState.phase])

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
      const cpuAction = () => {
        if (gameState.phase === "bidding") {
          // Simple CPU bidding strategy based on difficulty
          const hand = currentPlayer.hand || []
          let bid = 0

          if (currentPlayer.difficulty === "easy") {
            // Random bid
            bid = Math.floor(Math.random() * (hand.length + 1))
          } else if (currentPlayer.difficulty === "medium") {
            // Slightly smarter bidding based on high cards
            const highCards = hand.filter((card) => card.value === "A" || card.value === "K" || card.value === "Q")
            bid = Math.min(highCards.length + 1, hand.length)
          } else {
            // Hard difficulty - more sophisticated bidding
            const trumpCards = hand.filter((card) => card.suit === gameState.trumpCard?.suit)
            const highCards = hand.filter((card) => card.value === "A" || card.value === "K")
            bid = Math.min(trumpCards.length + highCards.length, hand.length)
          }

          // Place the bid after a short delay
          setTimeout(() => placeBid(currentPlayer.id, bid), 1000)
        } else if (gameState.phase === "playing") {
          // Simple CPU card playing strategy
          const hand = currentPlayer.hand || []
          let cardToPlay = hand[0] // Default to first card

          // Play a valid card based on the lead suit
          if (gameState.currentTrick.length > 0) {
            const leadSuit = gameState.currentTrick[0].suit
            const validCards = hand.filter((card) => card.suit === leadSuit)

            if (validCards.length > 0) {
              cardToPlay = validCards[0]
            }
          }

          // Play the card after a short delay
          setTimeout(() => playCard(currentPlayer.id, cardToPlay), 1000)
        }
      }

      // Add a delay for CPU actions to make the game feel more natural
      const timeoutId = setTimeout(cpuAction, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [gameState])

  // Toggle options view
  const toggleOptions = () => {
    setShowOptions(!showOptions)
  }

  // Save options and return to main menu
  const saveOptions = (options: { cpuDifficulty: string; canLeadWithTrump: boolean }) => {
    setCpuDifficulty(options.cpuDifficulty)
    setCanLeadWithTrump(options.canLeadWithTrump)
    setShowOptions(false)
  }

  // Render different game phases
  if (gameState.phase === "setup") {
    if (showOptions) {
      return (
        <GameOptions
          cpuDifficulty={cpuDifficulty}
          canLeadWithTrump={canLeadWithTrump}
          onSave={saveOptions}
          onCancel={() => setShowOptions(false)}
        />
      )
    }

    return (
      <Card className="p-6 w-full max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Oh Hell Card Game</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block mb-2">Number of CPU Players:</label>
            <Slider
              value={[numCpuPlayers]}
              min={1}
              max={5}
              step={1}
              onValueChange={(value) => setNumCpuPlayers(value[0])}
              className="mb-2"
            />
            <span className="block text-center">{numCpuPlayers}</span>
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
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">
            Round: {gameState.currentRound}/{gameState.maxRounds}
          </h2>
          <p>Dealer: {gameState.players[gameState.dealerPosition]?.name}</p>
        </div>

        <div>
          <p>Current Player: {gameState.players[gameState.currentPlayer]?.name}</p>
          {gameState.phase === "trickComplete" && (
            <p className="font-bold text-green-600">Trick Winner: {gameState.players[gameState.trickWinner]?.name}</p>
          )}
        </div>
      </div>

      <ScoreBoard
        players={gameState.players}
        scores={gameState.scores}
        bids={gameState.bids}
        tricks={gameState.tricks}
      />

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
            placeBid(0, Number.parseInt(card.value))
          } else {
            // Handle card play
            playCard(0, card)
          }
        }}
        isPlayerTurn={gameState.currentPlayer === 0}
      />

      {gameState.phase === "roundEnd" && (
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <h3 className="text-xl mb-4">Round {gameState.currentRound - 1} Complete!</h3>
          <Button onClick={nextRound}>Start Next Round</Button>
        </div>
      )}

      {gameState.phase === "gameEnd" && (
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <h3 className="text-xl mb-4">Game Over!</h3>
          <p className="mb-4">
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
          <Button onClick={() => setGameState({ ...gameState, phase: "setup" })}>Play Again</Button>
        </div>
      )}
    </div>
  )
}

