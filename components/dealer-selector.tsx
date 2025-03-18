"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import type { Player } from "@/lib/game-logic"

interface DealerSelectorProps {
  players: Player[]
  onDealerSelected: (dealerId: number) => void
}

export default function DealerSelector({ players, onDealerSelected }: DealerSelectorProps) {
  const [rotation, setRotation] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isAnimating, setIsAnimating] = useState(true)

  // Calculate the angle for each player segment
  const segmentAngle = 360 / players.length

  useEffect(() => {
    if (isAnimating) {
      // Animate for 3 seconds
      const duration = 3000
      const startTime = Date.now()

      // Start with fast rotation that gradually slows down
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function for slowing down
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

        // Calculate rotation based on progress
        // Start fast (720 degrees) and slow down to final position
        const targetRotation = 720 + Math.random() * 360
        const currentRotation = targetRotation * (1 - easeOut(progress))

        setRotation(currentRotation)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          // Animation complete
          setIsAnimating(false)

          // Calculate which player the pointer is pointing to
          const finalRotation = targetRotation % 360
          const selectedPlayerIndex = Math.floor(finalRotation / segmentAngle) % players.length
          setSelectedIndex(selectedPlayerIndex)

          // Notify parent component
          setTimeout(() => {
            onDealerSelected(players[selectedPlayerIndex].id)
          }, 1000)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [isAnimating, players, segmentAngle, onDealerSelected])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-6">Selecting Dealer</h2>

        <div className="relative w-64 h-64 mx-auto mb-6">
          {/* Pie chart segments */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            {players.map((player, index) => {
              const startAngle = index * segmentAngle
              const endAngle = (index + 1) * segmentAngle

              return (
                <div
                  key={player.id}
                  className={`absolute inset-0 ${index % 2 === 0 ? "bg-blue-500" : "bg-green-500"}`}
                  style={{
                    clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos(((startAngle - 90) * Math.PI) / 180)}% ${50 + 50 * Math.sin(((startAngle - 90) * Math.PI) / 180)}%, ${50 + 50 * Math.cos(((endAngle - 90) * Math.PI) / 180)}% ${50 + 50 * Math.sin(((endAngle - 90) * Math.PI) / 180)}%, 50% 50%)`,
                  }}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center text-white font-bold"
                    style={{
                      transform: `rotate(${startAngle + segmentAngle / 2}deg) translateY(-30px) rotate(-${startAngle + segmentAngle / 2}deg)`,
                    }}
                  >
                    {player.name}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Center point */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-gray-800 z-10"></div>
          </div>

          {/* Rotating pointer */}
          <motion.div
            className="absolute top-0 left-1/2 w-1 h-1/2 bg-red-600 origin-bottom"
            style={{
              rotate: rotation,
              transformOrigin: "bottom center",
            }}
          >
            <div className="w-3 h-3 -ml-1 bg-red-600 rounded-full"></div>
          </motion.div>
        </div>

        {!isAnimating && (
          <div className="text-xl font-bold animate-pulse">{players[selectedIndex].name} will be the dealer!</div>
        )}
      </div>
    </div>
  )
}

