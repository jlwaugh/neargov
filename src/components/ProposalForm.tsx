interface ProposalFormProps {
  title: string;
  proposal: string;
  onTitleChange: (value: string) => void;
  onProposalChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export const ProposalForm = ({
  title,
  proposal,
  onTitleChange,
  onProposalChange,
  onSubmit,
  loading,
}: ProposalFormProps) => {
  return (
    <div className="form">
      <div className="input-group">
        <label className="label">Proposal Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter a clear, descriptive title"
          className="input"
        />
      </div>

      <div className="input-group">
        <label className="label">
          Proposal Content
          <span className="label-hint">
            {" "}
            — Include objectives, budget, timeline, and KPIs
          </span>
        </label>
        <textarea
          value={proposal}
          onChange={(e) => onProposalChange(e.target.value)}
          placeholder="Paste your full proposal here..."
          rows={14}
          className="textarea textarea-code"
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={loading}
        className="btn btn-primary btn-full"
      >
        {loading ? (
          <>
            <span className="spinner">⏳</span>
            Evaluating proposal...
          </>
        ) : (
          <>
            <span className="btn-icon">✨</span>
            Screen Proposal
          </>
        )}
      </button>
    </div>
  );
};
