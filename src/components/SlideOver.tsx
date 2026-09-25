"use client";

import type { ReactNode } from "react";
import styles from "./dashboard.module.css";

export function SlideOver({
  kicker,
  title,
  onClose,
  children,
}: {
  kicker: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.panelBackdrop}>
      <div className={styles.panelScrim} onClick={onClose} />
      <aside className={styles.panelAside}>
        <div className={styles.panelHead}>
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <div className={styles.panelKicker}>{kicker}</div>
            <h3 className={styles.panelTitle}>{title}</h3>
          </div>
        </div>

        {children}

        <div className={styles.panelFooter}>
          <button className={styles.panelCloseBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
