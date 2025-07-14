import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">
        Welcome to Chat App
      </h1>
      <div className="text-center">
        <Link 
          to="/chat" 
          className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Go to Chat Room
        </Link>
      </div>
    </div>
  )
} 