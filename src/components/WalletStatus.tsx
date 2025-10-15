interface WalletStatusProps {
  signedAccountId: string | undefined;
  loading?: boolean;
}

export const WalletStatus = ({
  signedAccountId,
  loading,
}: WalletStatusProps) => {
  if (loading) {
    return null;
  }

  if (!signedAccountId) {
    return (
      <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
        <span className="alert-icon">⚠</span>
        <p className="alert-text">
          Please connect your NEAR wallet using the button in the top right
        </p>
      </div>
    );
  }

  return (
    <div className="feature-card" style={{ marginBottom: "1.5rem" }}>
      <div className="feature-icon">✓</div>
      <div>
        <h3 className="feature-title">NEAR Wallet Connected</h3>
        <p className="feature-text">{signedAccountId}</p>
      </div>
    </div>
  );
};
