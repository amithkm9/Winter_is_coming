"""The 16 curated Paris districts and their AI nodes (see PLAN.md section 5)."""

from dataclasses import dataclass


@dataclass(frozen=True)
class District:
    id: int
    name: str
    bossNode: str
    theme: str
    signPool: tuple[str, ...]


DISTRICTS: dict[int, District] = {
    d.id: d
    for d in [
        District(1, "Louvre / Paris Centre", "NEXUS-Archive",
                 "Unlocking the subterranean resistance gateway", ("OPEN_PALM",)),
        District(2, "Bourse / Financial Hub", "NEXUS-Ledger",
                 "Freezing the AI automated resource pipeline", ("HALT",)),
        District(3, "Le Marais", "NEXUS-Cipher",
                 "Rekindling human empathy in the cultural sector", ("HEART",)),
        District(4, "Ile de la Cite (Notre-Dame)", "NEXUS-Signal",
                 "Igniting the beacon tower on the Seine", ("LIGHT",)),
        District(5, "Latin Quarter / Sorbonne", "NEXUS-Library",
                 "Overriding AI propaganda with human history", ("BOOK", "LIGHT")),
        District(6, "Saint-Germain-des-Pres", "NEXUS-Voice",
                 "Establishing the hidden covert safehouse", ("SILENCE", "OPEN_PALM")),
        District(7, "Eiffel Tower", "NEXUS-Transmitter",
                 "Re-broadcasting the human resistance signal", ("LIGHT", "PEACE_V")),
        District(8, "Champs-Elysees", "NEXUS-Autocrat",
                 "Marching down the grand avenue", ("FREEDOM", "BREAK")),
        District(9, "Opera Garnier", "NEXUS-Harmonics",
                 "Disrupting AI acoustic sensors", ("LISTEN", "SILENCE", "HALT")),
        District(10, "Canal Saint-Martin", "NEXUS-Flow",
                 "Reopening the aqueduct cooling bypass", ("WATER", "OPEN_PALM", "FIRE")),
        District(11, "Bastille", "NEXUS-Prison",
                 "Liberating imprisoned human hackers", ("BREAK", "FREEDOM", "TOGETHER")),
        District(12, "Bercy", "NEXUS-Depot",
                 "Rallying human logistics and supplies", ("TOGETHER", "POINT", "THUMB_UP")),
        District(13, "Olympiades / Tech Hub", "NEXUS-Compute",
                 "Hacking the auxiliary graphics clusters", ("CODE", "BREAK", "SHIELD")),
        District(14, "Montparnasse", "NEXUS-Monolith",
                 "Shielding against incoming drone retaliation", ("SHIELD", "HALT", "FIRE")),
        District(15, "Grenelle / Seine Front", "NEXUS-Power",
                 "Rerouting the power grid to the citizens", ("FIRE", "LIGHT", "TOGETHER")),
        District(16, "Montmartre / Sacre-Coeur", "NEXUS-PRIME CORE",
                 "The final summit showdown atop the hill",
                 ("SHIELD", "FIRE", "BREAK", "PEACE_V")),
    ]
}


def get_district(district_id: int) -> District:
    try:
        return DISTRICTS[district_id]
    except KeyError as exc:
        raise KeyError(f"Unknown district: {district_id}") from exc
