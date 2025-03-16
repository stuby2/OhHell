"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface GameOptionsProps {
  cpuDifficulty: string
  canLeadWithTrump: boolean
  onSave: (options: { cpuDifficulty: string; canLeadWithTrump: boolean }) => void
  onCancel: () => void
}

export default function GameOptions({ cpuDifficulty, canLeadWithTrump, onSave, onCancel }: GameOptionsProps) {
  const [difficulty, setDifficulty] = useState(cpuDifficulty)
  const [leadWithTrump, setLeadWithTrump] = useState(canLeadWithTrump)

  const handleSave = () => {
    onSave({
      cpuDifficulty: difficulty,
      canLeadWithTrump: leadWithTrump,
    })
  }

  return (
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
          <Label className="text-base">Can Lead with Trump:</Label>
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
  )
}

