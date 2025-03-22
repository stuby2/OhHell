"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import Image from "next/image"

interface GameTutorialProps {
  onClose: () => void
}

export default function GameTutorial({ onClose }: GameTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const tutorialSteps = [
    {
      title: "Welcome to Oh Hell!",
      content: (
        <>
          <p className="mb-4">
            Oh Hell! (also known as "Oh Heck!" or "Nomination Whist") is a trick-taking card game where the goal is to
            accurately predict how many tricks you'll win in each round.
          </p>
          <p>
            The key to success is a combination of accurate bidding and strategic card play. Sometimes winning a trick
            is important, while other times it's better to throw away strong cards!
          </p>
        </>
      ),
      image: "/img/tutorial_img1.jpg",
    },
    {
      title: "Game Setup",
      content: (
        <>
          <p className="mb-4">
            The game is played with a standard 52-card deck. Each player receives the same number of cards in each
            round.
          </p>
          <p className="mb-4">
            The game starts with a small number of cards (usually 1) and increases each round until reaching a maximum,
            then decreases back to 1 if playing with the "ladder" option.
          </p>
          <p>
            After the cards are dealt, a trump card is revealed. The trump suit outranks all other suits during play.
          </p>
        </>
      ),
      image: "/img/tutorial_img2.jpg",
    },
    {
      title: "Bidding Phase",
      content: (
        <>
          <p className="mb-4">
            Before playing begins, each player must bid on exactly how many tricks they think they'll win in the round.
          </p>
          <p className="mb-4">
            The dealer bids last and cannot make a bid that would make the total bids equal the number of cards in the
            round. This ensures that not everyone can make their bid.
          </p>
          <p>
            <strong>Bidding is crucial!</strong> You'll only score points if you win exactly the number of tricks you
            bid.
          </p>
        </>
      ),
      image: "/img/tutorial_img3.jpg",
    },
    {
      title: "Playing Phase",
      content: (
        <>
          <p className="mb-4">Play proceeds clockwise. The player to the dealer's left leads the first trick. The winner of the previous trick leads the next.</p>
          <p className="mb-4">
            You must follow suit if possible. If you can't follow suit, you may play any card, including a trump.
          </p>
          <p>
            The highest card of the led suit wins the trick, unless a trump is played, in which case the highest trump
            wins.
          </p>
        </>
      ),
      image: "/img/tutorial_img4.jpg",
    },
    {
      title: "Trump Rules",
      content: (
        <>
          <p className="mb-4">
            By default, you cannot lead with a trump card unless trump has been "broken" or you have no other option.
          </p>
          <p className="mb-4">
            Trump is "broken" when a player plays a trump card during a trick because they couldn't follow suit.
          </p>
          <p>You can change this rule in the options to allow leading with trump at any time.</p>
        </>
      ),
      image: "/img/tutorial_img5.jpg",
    },
    {
      title: "Scoring",
      content: (
        <>
          <p className="mb-4">
            If you win exactly the number of tricks you bid, you score 10 points plus the number of tricks bid.
          </p>
          <p className="mb-4">If you win more or fewer tricks than you bid, you score 0 points for that round.</p>
          <p>The player with the highest score at the end of all rounds wins the game.</p>
        </>
      ),
      image: "/img/tutorial_img6.jpg",
    },
    {
      title: "Strategy Tips",
      content: (
        <>
          <p className="mb-4">
            <strong>Bidding Strategy:</strong> Consider your high cards, trump cards, and the distribution of suits in
            your hand. Sometimes a conservative bid is safer than an ambitious one.
          </p>
          <p className="mb-4">
            <strong>Playing Strategy:</strong> If you've already made your bid, try to play cards that won't win
            additional tricks. If you need more tricks, save your high cards for when they'll be most effective.
          </p>
          <p>Remember: Taking tricks is equally as important as throwing away strong cards at the right time!</p>
        </>
      ),
      image: "/img/tutorial_img7.jpg",
    },
  ]

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <Card className="p-6 w-full max-w-3xl mx-auto h-fit">
      <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={onClose}>
        <X className="h-5 w-5" />
      </Button>

      <h2 className="text-2xl font-bold mb-6 text-center">Learn to Play Oh Hell!</h2>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-full md:w-1/2 relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <Image
              src={tutorialSteps[currentStep].image || "/placeholder.svg?height=300&width=400"}
              alt={tutorialSteps[currentStep].title}
              fill
              className="object-cover"
            />
          </div>
        </div>

        <div className="w-full md:w-1/2">
          <h3 className="text-xl font-semibold mb-3">{tutorialSteps[currentStep].title}</h3>
          <div className="text-sm text-gray-700">{tutorialSteps[currentStep].content}</div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Button onClick={handlePrevious} disabled={currentStep === 0} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>

        <div className="text-sm text-gray-500">
          Step {currentStep + 1} of {tutorialSteps.length}
        </div>

        {currentStep < tutorialSteps.length - 1 ? (
          <Button onClick={handleNext}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onClose}>Start Playing!</Button>
        )}
      </div>
    </Card>
  )
}

