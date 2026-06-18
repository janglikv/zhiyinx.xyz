import type { MeResponse } from "../../App";
import StartBar from "../../components/StartBar";
import Background from "../../components/Background";
import Arrow from "../../components/Arrow";
import GroceryStore from "../../components/GroceryStore";
import styles from "./index.module.css";

type HomePageProps = {
  me: MeResponse;
  onLogout: () => void;
  onOpenLogin: () => void;
};

export default function HomePage({ me, onLogout, onOpenLogin }: HomePageProps) {
  return (
    <>
      <Background />

      {/* 主要内容区域 - 保持空白 */}
      <main className={styles.container}>
        {/* 空白内容 */}
        {me.items?.map((item) => {
          if (item.item_type === "arrow") {
            return <Arrow key={item.id} bottom={item.bottom} left={item.left} />;
          }
          if (item.item_type === "grocery") {
            return <GroceryStore key={item.id} bottom={item.bottom} left={item.left} />;
          }
          return null;
        })}
      </main>

      {/* 底部栏组件 */}
      <StartBar
        me={me}
        onLogout={onLogout}
        onOpenLogin={onOpenLogin}
      />
    </>
  );
}


