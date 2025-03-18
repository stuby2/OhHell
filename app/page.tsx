import GameBoard from "@/components/game-board"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24 bg-gray-100">
      <div className="z-10 w-full max-w-5xl items-center justify-between">
        <h1 className="text-4xl font-bold text-center mb-8">Oh Hell!</h1>
        <GameBoard />
      </div>
    </main>
  )
}

