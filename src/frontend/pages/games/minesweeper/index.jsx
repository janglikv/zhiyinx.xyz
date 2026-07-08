import GamePlaceholder from "../../../components/GamePlaceholder";

function MinesweeperPage({ me, onLogout, onOpenLogin }) {
  return (
    <GamePlaceholder
      gameId="minesweeper"
      me={me}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
    />
  );
}

export default MinesweeperPage;
