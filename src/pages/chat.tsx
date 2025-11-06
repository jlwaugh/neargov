import { Chatbot } from "@/components/Chatbot";

export default function ChatPage() {
  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="card">
          <Chatbot
            welcomeMessage="I can help you understand NEAR governance proposals, explain platform features, or answer questions about the screening process."
            placeholder="Ask me about NEAR governance..."
          />
        </div>

        <footer className="footer">
          <p className="footer-text">
            All conversations are private and run in Trusted Execution
            Environments (TEEs). Responses are cryptographically verifiable.
          </p>
        </footer>
      </div>
    </div>
  );
}
