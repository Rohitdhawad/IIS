from neo4j import GraphDatabase

from app.config import settings


class Neo4jService:
    """Handles communication with the Neo4j AuraDB graph database."""

    def __init__(self):
        self.driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(
                settings.NEO4J_USERNAME,
                settings.NEO4J_PASSWORD,
            ),
        )

    def verify_connection(self) -> bool:
        """Verify that Neo4j AuraDB is reachable."""
        try:
            self.driver.verify_connectivity()
            return True
        except Exception:
            return False

    def close(self):
        """Close the Neo4j driver."""
        self.driver.close()


neo4j_service = Neo4jService()