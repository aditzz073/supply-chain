import logging
import asyncio
import httpx

logger = logging.getLogger(__name__)

OPENFDA_NDC_URL = "https://api.fda.gov/drug/ndc.json"
OPENFDA_LABEL_URL = "https://api.fda.gov/drug/label.json"
OPENFDA_ESTAB_URL = "https://api.fda.gov/other/substance.json"
RXNORM_URL = "https://rxnav.nlm.nih.gov/REST/drugs.json"


async def _fetch_json(client: httpx.AsyncClient, url: str, params: dict, source: str) -> dict:
    """Fetch JSON from a URL, returning empty dict on failure."""
    try:
        response = await client.get(url, params=params, timeout=15.0)
        if response.status_code == 200:
            return response.json()
        logger.warning(f"{source} returned {response.status_code}")
    except Exception as e:
        logger.warning(f"{source} fetch failed: {e}")
    return {}


async def get_openfda_ndc(client: httpx.AsyncClient, medicine_name: str) -> dict:
    """Query OpenFDA NDC endpoint for real manufacturers and brand names."""
    data = await _fetch_json(
        client,
        OPENFDA_NDC_URL,
        {"search": f'generic_name:"{medicine_name}"', "limit": "50"},
        "OpenFDA NDC",
    )
    results = data.get("results", [])
    manufacturers = list(set(
        r.get("labeler_name") for r in results if r.get("labeler_name")
    ))
    brands = list(set(
        r.get("brand_name") for r in results if r.get("brand_name")
    ))
    dosage_forms = list(set(
        r.get("dosage_form") for r in results if r.get("dosage_form")
    ))
    routes = list(set(
        r.get("route", [None])[0] for r in results
        if r.get("route") and r["route"][0]
    ))
    packaging = []
    for r in results:
        for pkg in r.get("packaging", []):
            desc = pkg.get("description")
            if desc:
                packaging.append(desc)
    packaging = list(set(packaging))[:10]

    logger.info(f"OpenFDA NDC: {len(manufacturers)} manufacturers, {len(brands)} brands")
    return {
        "manufacturers": sorted(manufacturers),
        "brands": sorted(brands),
        "dosage_forms": sorted(dosage_forms),
        "routes": sorted(routes),
        "packaging_examples": packaging,
    }


async def get_openfda_label(client: httpx.AsyncClient, medicine_name: str) -> dict:
    """Query OpenFDA label endpoint for drug info, indications, warnings."""
    data = await _fetch_json(
        client,
        OPENFDA_LABEL_URL,
        {"search": f'openfda.generic_name:"{medicine_name}"', "limit": "5"},
        "OpenFDA Label",
    )
    results = data.get("results", [])
    if not results:
        return {}

    first = results[0]
    openfda = first.get("openfda", {})

    drug_class = openfda.get("pharm_class_epc", [])
    substance = openfda.get("substance_name", [])
    indications = first.get("indications_and_usage", [""])[0][:500] if first.get("indications_and_usage") else ""

    logger.info(f"OpenFDA Label: drug_class={drug_class}, substance={substance}")
    return {
        "drug_class": drug_class,
        "substance_name": substance,
        "indications": indications,
        "manufacturer_name": openfda.get("manufacturer_name", []),
    }


async def get_rxnorm_data(client: httpx.AsyncClient, medicine_name: str) -> dict:
    """Query RxNorm for brand names and related drug concepts."""
    data = await _fetch_json(
        client,
        RXNORM_URL,
        {"name": medicine_name},
        "RxNorm",
    )
    concept_group = data.get("drugGroup", {}).get("conceptGroup", [])
    brands = []
    generics = []
    for group in concept_group:
        tty = group.get("tty", "")
        for prop in group.get("conceptProperties", []):
            name = prop.get("name", "")
            if tty in ("SBD", "SBD_DF"):
                brands.append(name)
            elif tty in ("SCD", "SCD_DF"):
                generics.append(name)
            else:
                generics.append(name)

    brands = list(set(brands))[:20]
    generics = list(set(generics))[:20]
    logger.info(f"RxNorm: {len(brands)} branded, {len(generics)} generic concepts")
    return {"branded_formulations": brands, "generic_formulations": generics}


async def get_fda_establishments(client: httpx.AsyncClient, medicine_name: str) -> dict:
    """Query OpenFDA drug/drugsfda for registered establishments and application holders."""
    data = await _fetch_json(
        client,
        "https://api.fda.gov/drug/drugsfda.json",
        {"search": f'openfda.generic_name:"{medicine_name}"', "limit": "20"},
        "OpenFDA DrugsFDA",
    )
    results = data.get("results", [])
    sponsors = []
    app_numbers = []
    for r in results:
        sponsor = r.get("sponsor_name", "")
        if sponsor:
            sponsors.append(sponsor)
        app_no = r.get("application_number", "")
        if app_no:
            app_numbers.append(app_no)
        for prod in r.get("products", []):
            mfr = prod.get("marketing_status", "")
            brand = prod.get("brand_name", "")
            if brand:
                sponsors.append(brand)

    sponsors = list(set(sponsors))
    app_numbers = list(set(app_numbers))[:10]
    logger.info(f"OpenFDA DrugsFDA: {len(sponsors)} sponsors/brands, {len(app_numbers)} applications")
    return {"sponsors": sorted(sponsors), "application_numbers": app_numbers}


async def gather_real_data(medicine_name: str) -> dict:
    """Query all real data sources in parallel and compile results."""
    async with httpx.AsyncClient() as client:
        ndc_task = get_openfda_ndc(client, medicine_name)
        label_task = get_openfda_label(client, medicine_name)
        rxnorm_task = get_rxnorm_data(client, medicine_name)
        estab_task = get_fda_establishments(client, medicine_name)

        ndc, label, rxnorm, estab = await asyncio.gather(
            ndc_task, label_task, rxnorm_task, estab_task, return_exceptions=True
        )

    if isinstance(ndc, Exception):
        logger.error(f"NDC fetch error: {ndc}")
        ndc = {}
    if isinstance(label, Exception):
        logger.error(f"Label fetch error: {label}")
        label = {}
    if isinstance(rxnorm, Exception):
        logger.error(f"RxNorm fetch error: {rxnorm}")
        rxnorm = {}
    if isinstance(estab, Exception):
        logger.error(f"Establishments fetch error: {estab}")
        estab = {}

    compiled = {
        "openfda_ndc": ndc,
        "openfda_label": label,
        "rxnorm": rxnorm,
        "fda_establishments": estab,
    }
    logger.info(f"Real data compiled for '{medicine_name}'")
    return compiled


def format_real_data_for_prompt(medicine_name: str, real_data: dict) -> str:
    """Format the compiled real data into a text block for the LLM prompt."""
    sections = [f"VERIFIED REAL-WORLD DATA FROM FDA AND NIH DATABASES FOR: {medicine_name.upper()}\n"]

    ndc = real_data.get("openfda_ndc", {})
    if ndc.get("manufacturers"):
        sections.append(f"FDA-Registered Manufacturers/Labelers ({len(ndc['manufacturers'])} found):\n- " + "\n- ".join(ndc["manufacturers"][:15]))
    if ndc.get("brands"):
        sections.append(f"\nFDA-Registered Brand Names ({len(ndc['brands'])} found):\n- " + "\n- ".join(ndc["brands"][:12]))
    if ndc.get("dosage_forms"):
        sections.append(f"\nDosage Forms in Market: {', '.join(ndc['dosage_forms'])}")

    label = real_data.get("openfda_label", {})
    if label.get("drug_class"):
        sections.append(f"\nPharmacological Class: {', '.join(label['drug_class'])}")
    if label.get("substance_name"):
        sections.append(f"Active Substance / Salt: {', '.join(label['substance_name'])}")
    if label.get("manufacturer_name"):
        sections.append(f"Additional Verified Manufacturers from FDA Labels:\n- " + "\n- ".join(label["manufacturer_name"][:10]))
    if label.get("indications"):
        sections.append(f"\nIndications (from FDA label):\n{label['indications'][:300]}")

    rxnorm = real_data.get("rxnorm", {})
    if rxnorm.get("branded_formulations"):
        sections.append(f"\nRxNorm Branded Formulations:\n- " + "\n- ".join(rxnorm["branded_formulations"][:15]))
    if rxnorm.get("generic_formulations"):
        sections.append(f"\nRxNorm Generic Formulations:\n- " + "\n- ".join(rxnorm["generic_formulations"][:10]))

    estab = real_data.get("fda_establishments", {})
    if estab.get("sponsors"):
        sections.append(f"\nFDA Application Sponsors / Holders ({len(estab['sponsors'])} found):\n- " + "\n- ".join(estab["sponsors"][:12]))
    if estab.get("application_numbers"):
        sections.append(f"FDA Application Numbers: {', '.join(estab['application_numbers'][:8])}")

    if len(sections) == 1:
        sections.append("No external data could be retrieved. Use only high-confidence knowledge.")

    sections.append("\nCRITICAL INSTRUCTIONS FOR USING THIS DATA:")
    sections.append("1. Use the verified companies above as your PRIMARY source for manufacturer and distributor nodes — these are real FDA-registered companies.")
    sections.append("2. For each FDA-registered company above, create a node with its real country of operation.")
    sections.append("3. Add raw material / API supplier nodes for the countries known to produce the active ingredient (e.g. India, China for most generics).")
    sections.append("4. Add regional distributor nodes for major markets: USA, EU, India, China, Brazil, Middle East, Southeast Asia, Africa.")
    sections.append("5. Add endpoint nodes for major hospital/pharmacy chains in each region.")

    return "\n".join(sections)
