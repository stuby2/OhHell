"use client"

import { useState, useEffect } from "react"
import type { Player } from "@/lib/game-logic"
import { Button } from "@/components/ui/button"

interface DealerSelectorProps {
  players: Player[]
  onDealerSelected: (dealerId: number) => void
}

export default function DealerSelector({ players, onDealerSelected }: DealerSelectorProps) {
  const [selectedDealer, setSelectedDealer] = useState<Player | null>(null)

  // Randomly select a dealer when the component mounts
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * players.length)
    setSelectedDealer(players[randomIndex])
  }, [players])

  // If no dealer is selected yet, show loading
  if (!selectedDealer) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-6">Selecting dealer...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-6">Dealer Randomly Selected</h2>

        <div className="text-xl mb-8">
          <p className="font-bold text-2xl text-primary animate-pulse">{selectedDealer.name} will be the dealer!</p>
        </div>

        <Button onClick={() => onDealerSelected(selectedDealer.id)} size="lg" className="px-8">
          Continue
        </Button>
      </div>
    </div>
  )
}

