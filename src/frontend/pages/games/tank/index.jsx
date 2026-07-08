import GamePlaceholder from "../../../components/GamePlaceholder";

function TankPage({ me, onLogout, onOpenLogin }) {
  return (
    <GamePlaceholder
      gameId="tank"
      me={me}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
    />
  );
}

export default TankPage;
