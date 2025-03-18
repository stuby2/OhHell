import type { Player } from "@/lib/game-logic"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ScoreBoardProps {
  players: Player[]
  scores: Record<number, number>
  bids: Record<number, number>
  tricks: Record<number, number>
  showResults?: boolean
}

export default function ScoreBoard({ players, scores, bids, tricks, showResults = false }: ScoreBoardProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Bid</TableHead>
            <TableHead>Tricks</TableHead>
            {showResults && <TableHead>Result</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => {
            const playerBid = bids[player.id]
            const playerTricks = tricks[player.id]
            const madeContract = playerBid === playerTricks

            return (
              <TableRow key={player.id} className={showResults ? (madeContract ? "bg-green-50" : "bg-red-50") : ""}>
                <TableCell className="font-medium">{player.name}</TableCell>
                <TableCell>{scores[player.id]}</TableCell>
                <TableCell>{playerBid === -1 ? "-" : playerBid}</TableCell>
                <TableCell>{playerTricks}</TableCell>
                {showResults && (
                  <TableCell>
                    {playerBid !== -1 && (
                      <span className={madeContract ? "text-green-600 font-bold" : "text-red-600"}>
                        {madeContract ? "Made it!" : "Missed"}
                      </span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

