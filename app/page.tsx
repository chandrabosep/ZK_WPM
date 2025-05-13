import TypingTest from "@/components/typing-test"

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold text-center mb-8">ZK WPM</h1>
      <div className="max-w-4xl mx-auto">
        <TypingTest />
      </div>
    </main>
  )
}
