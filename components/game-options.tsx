"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HelpCircle } from "lucide-react"

interface GameOptionsProps {
  cpuDifficulty: string
  canLeadWithTrump: boolean
  autoplay: boolean
  boardColor: string
  ladder: boolean
  onSave: (options: {
    cpuDifficulty: string
    canLeadWithTrump: boolean
    autoplay: boolean
    boardColor: string
    ladder: boolean
  }) => void
  onCancel: () => void
}

// Board color options
const boardColors = [
  { name: "Green", value: "bg-green-800" },
  { name: "Blue", value: "bg-blue-800" },
  { name: "Red", value: "bg-red-800" },
  { name: "Purple", value: "bg-purple-800" },
  { name: "Teal", value: "bg-teal-800" },
  { name: "Gray", value: "bg-gray-800" },
  { name: "Brown", value: "bg-amber-900" },
]

export default function GameOptions({
  cpuDifficulty,
  canLeadWithTrump,
  autoplay,
  boardColor,
  ladder,
  onSave,
  onCancel,
}: GameOptionsProps) {
  const [difficulty, setDifficulty] = useState(cpuDifficulty)
  const [leadWithTrump, setLeadWithTrump] = useState(canLeadWithTrump)
  const [autoplayEnabled, setAutoplayEnabled] = useState(autoplay)
  const [selectedBoardColor, setSelectedBoardColor] = useState(boardColor)
  const [ladderEnabled, setLadderEnabled] = useState(ladder)

  const handleSave = () => {
    onSave({
      cpuDifficulty: difficulty,
      canLeadWithTrump: leadWithTrump,
      autoplay: autoplayEnabled,
      boardColor: selectedBoardColor,
      ladder: ladderEnabled,
    })
  }

  return (
    <TooltipProvider>
      <Card className="p-6 w-full max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Game Options</h2>

        <div className="space-y-6 mb-8">
          <div className="flex items-center justify-between">
            <Label htmlFor="cpu-difficulty" className="text-base">
              CPU Difficulty:
            </Label>
            <Select id="cpu-difficulty" value={difficulty} onValueChange={setDifficulty} className="w-40">
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="board-color" className="text-base">
              Board Color:
            </Label>
            <Select id="board-color" value={selectedBoardColor} onValueChange={setSelectedBoardColor} className="w-40">
              <SelectTrigger>
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {boardColors.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${color.value}`}></div>
                      {color.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-base">Leading with Trump:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Leading with Trump</h4>
                    <p className="text-sm text-muted-foreground">
                      When enabled, players can lead a trick with a trump card even if they have other suits. When
                      disabled, players cannot lead with a trump card unless they have no other option, until trump is
                      "broken". Trump is broken in two cases: 1) when a player plays a trump card when they couldn't
                      follow suit, or 2) when a player is forced to lead with a trump card because they have no other
                      suits in their hand. After trump is broken, players can lead with trump cards freely for the rest
                      of the round.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <RadioGroup
              value={leadWithTrump ? "yes" : "no"}
              onValueChange={(value) => setLeadWithTrump(value === "yes")}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="lead-trump-yes" />
                <Label htmlFor="lead-trump-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="lead-trump-no" />
                <Label htmlFor="lead-trump-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-base">Autoplay:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Autoplay</h4>
                    <p className="text-sm text-muted-foreground">
                      When enabled, if you only have one legal card to play, it will be played automatically.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <RadioGroup
              value={autoplayEnabled ? "yes" : "no"}
              onValueChange={(value) => setAutoplayEnabled(value === "yes")}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="autoplay-yes" />
                <Label htmlFor="autoplay-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="autoplay-no" />
                <Label htmlFor="autoplay-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-base">Ladder:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Ladder</h4>
                    <p className="text-sm text-muted-foreground">
                      When enabled, after reaching the highest round, the game loops back to round 1 and continues until
                      all rounds have been played.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <RadioGroup
              value={ladderEnabled ? "yes" : "no"}
              onValueChange={(value) => setLadderEnabled(value === "yes")}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="ladder-yes" />
                <Label htmlFor="ladder-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="ladder-no" />
                <Label htmlFor="ladder-no">No</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button onClick={handleSave} className="flex-1">
            Save Options
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </Card>
    </TooltipProvider>
  )
}

