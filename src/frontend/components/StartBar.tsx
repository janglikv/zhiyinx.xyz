import { useEffect, useRef } from "react";
import type { MeResponse } from "../App";
import styles from "./StartBar.module.css";

type StartBarProps = {
  me: MeResponse;
  onLogout: () => void;
  onOpenLogin: () => void;
};

export default function StartBar({ me, onLogout, onOpenLogin }: StartBarProps) {
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    barRef.current?.scrollIntoView({ behavior: "auto" });
  }, []);

  return (
    <header ref={barRef} className={styles.headerGlass}>
      <div className={`container ${styles.headerContent}`}>
        <a href="#" className={styles.logoGroup} onClick={(e) => e.preventDefault()}>
          <span className={styles.logoText}>
            知音 <span className={styles.logoTextEn}>ZHIYIN</span>
          </span>
        </a>

        <div className={styles.userNav}>
          {me.authenticated ? (
            <>
              <div className={styles.avatarBadge}>
                <div className={styles.avatar}>{me.email ? me.email[0] : "U"}</div>
                <span className={styles.avatarEmail} title={me.email || ""}>
                  {me.email?.split("@")[0]}
                </span>
              </div>
              <button className="btn btn-ghost" onClick={onLogout} style={{ padding: "6px 12px", fontSize: "12px" }}>
                退出
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onOpenLogin}>
              登录 / 注册
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
