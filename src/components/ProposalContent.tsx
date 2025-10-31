interface ProposalContentProps {
  content: string;
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
}

export default function ProposalContent({
  content,
  isExpanded,
  onToggleExpand,
}: ProposalContentProps) {
  return (
    <>
      {/* Content wrapper */}
      <div
        style={{
          maxHeight: isExpanded ? "none" : "400px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            lineHeight: "1.8",
            color: "#374151",
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Gradient overlay when collapsed */}
        {!isExpanded && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "100px",
              background: "linear-gradient(to bottom, transparent, white)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Read More/Hide button */}
      {!isExpanded ? (
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button
            onClick={() => onToggleExpand(true)}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#374151",
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
          >
            Read More
          </button>
        </div>
      ) : (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
          }}
        >
          <button
            onClick={() => onToggleExpand(false)}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#374151",
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow:
                "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
          >
            Hide
          </button>
        </div>
      )}

      {/* CSS for diff highlighting */}
      <style jsx>{`
        :global(ins) {
          background-color: #d1fae5;
          text-decoration: none;
          padding: 0 2px;
          border-radius: 2px;
        }
        :global(del) {
          background-color: #fee2e2;
          text-decoration: line-through;
          padding: 0 2px;
          border-radius: 2px;
        }
      `}</style>
    </>
  );
}
