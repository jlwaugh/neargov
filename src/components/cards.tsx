import Link from "next/link";
import styles from "@/styles/app.module.css";

export const Cards = () => {
  return (
    <div className={styles.grid}>
      <Link href="/discourse/link" className={styles.card}>
        <h2>
          Link Discourse <span>-&gt;</span>
        </h2>
        <p>Connect your NEAR account with your Discourse forum account.</p>
      </Link>

      <Link
        href="https://docs.near.org/build/web3-apps/quickstart"
        className={styles.card}
        target="_blank"
        rel="noopener noreferrer"
      >
        <h2>
          Near Docs <span>-&gt;</span>
        </h2>
        <p>Learn how this application works, and what you can build on Near.</p>
      </Link>

      <Link
        href="https://near.social"
        className={styles.card}
        target="_blank"
        rel="noopener noreferrer"
      >
        <h2>
          NEAR Social <span>-&gt;</span>
        </h2>
        <p>Explore the decentralized social network on NEAR.</p>
      </Link>
    </div>
  );
};
