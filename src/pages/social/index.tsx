import { Cards } from "@/components/cards";
import { useEffect, useState } from "react";
import styles from "@/styles/app.module.css";
import { SocialContract } from "../../config";
import { useNear } from "@/hooks/useNear";

export default function SocialNear() {
  const { signedAccountId, viewFunction } = useNear();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadProfile = async () => {
    if (!signedAccountId) return;

    setLoading(true);
    try {
      const data = await viewFunction({
        contractId: SocialContract,
        method: "get",
        args: {
          keys: [`${signedAccountId}/profile/**`],
        },
      });
      setProfileData(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (signedAccountId) {
      loadProfile();
    }
  }, [signedAccountId]);

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <p>
          Interacting with: &nbsp;
          <code className={styles.code}>{SocialContract}</code>
        </p>
      </div>

      <div className={styles.center}>
        {signedAccountId ? (
          <div>
            <h2>Connected as: {signedAccountId}</h2>
            {loading && <p>Loading profile...</p>}
            {profileData && (
              <pre className="text-start">
                {JSON.stringify(profileData, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <h2>Please login to view your social.near profile</h2>
        )}
      </div>
      <Cards />
    </main>
  );
}
