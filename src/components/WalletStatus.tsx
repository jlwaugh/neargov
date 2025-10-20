interface WalletStatusProps {
  signedAccountId: string | undefined;
  loading?: boolean;
  showWarningIfNotConnected?: boolean;
}

export const WalletStatus = ({
  signedAccountId,
  loading,
  showWarningIfNotConnected = true,
}: WalletStatusProps) => {
  if (loading) {
    return null;
  }

  if (!signedAccountId && showWarningIfNotConnected) {
    return (
      <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
        <span className="alert-icon">⚠</span>
        <p className="alert-text">
          Please connect your NEAR wallet using the button in the top right
        </p>
      </div>
    );
  }

  if (signedAccountId) {
    return (
      <div className="feature-card" style={{ marginBottom: "1.5rem" }}>
        <div className="feature-icon">✓</div>
        <div>
          <h3 className="feature-title">NEAR Wallet Connected</h3>
          <p className="feature-text">{signedAccountId}</p>
        </div>
      </div>
    );
  }

  return null;
};
