"use client"

interface FaceDownCardProps {
  className?: string
}

export default function FaceDownCard({ className = "" }: FaceDownCardProps) {
  return (
    <div
      className={`w-12 h-18 bg-white rounded-md border border-gray-300 flex flex-col justify-between p-1 shadow-md
        ${className}`}
      style={{
        backgroundImage: "repeating-linear-gradient(45deg, #e0e0e0, #e0e0e0 5px, #f0f0f0 5px, #f0f0f0 10px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-8 h-12 rounded-sm bg-blue-700 border border-blue-900">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-xs font-bold">OH</div>
          </div>
        </div>
      </div>
    </div>
  )
}

