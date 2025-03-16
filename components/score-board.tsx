import type { Player } from "@/lib/game-logic"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ScoreBoardProps {
  players: Player[]
  scores: Record<number, number>
  bids: Record<number, number>
  tricks: Record<number, number>
}

export default function ScoreBoard({ players, scores, bids, tricks }: ScoreBoardProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Bid</TableHead>
            <TableHead>Tricks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <TableRow key={player.id}>
              <TableCell>{player.name}</TableCell>
              <TableCell>{scores[player.id]}</TableCell>
              <TableCell>{bids[player.id] === -1 ? "-" : bids[player.id]}</TableCell>
              <TableCell>{tricks[player.id]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

