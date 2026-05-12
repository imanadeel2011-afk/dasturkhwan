from groq import Groq

# ⚠️ Apni Groq API key yahan lagao
API_KEY = "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"

client = Groq(api_key=API_KEY)

common_dishes = [
    # Anday
    "Aalu Anday", "Anday Ki Bhurji", "Anda Fry",
    "Anday Salan", "Anday Aalu",

    # Aalu dishes
    "Aalu Ki Bhujia", "Aalu Matar", "Aalu Palak",
    "Aalu Methi", "Aalu Gosht", "Aalu Keema",
    "Aalu Tamatar", "Aalu Ka Paratha",

    # Sabzi dishes
    "Bhindi Masala", "Kaddu Ki Sabzi", "Baingan Bharta",
    "Baingan Tamatar", "Karela Pyaz", "Torai Ki Sabzi",
    "Loki Ki Sabzi", "Tinda Masala", "Gobhi Aloo",
    "Band Gobhi Gosht", "Arvi Masala", "Shalgam Gosht",
    "Palak Gosht", "Methi Gosht", "Saag",
    "Sarson Ka Saag", "Mix Sabzi", "Sem Ki Phali",
    "Shimla Mirch Gosht", "Karela Gosht",

    # Daal dishes
    "Daal Mash", "Daal Masoor", "Daal Chana",
    "Daal Moong", "Mix Daal", "Daal Chawal",
    "Maash Ki Daal", "Lobia", "Rajma",
    "Chana Masala", "Cholay",

    # Chicken dishes (ghar wala)
    "Chicken Karahi", "Chicken Curry", "Chicken Salan",
    "Chicken Jalfrezi", "Chicken Aloo", "Chicken Palak",
    "Chicken Keema", "Chicken Do Pyaza",
    "Chicken Kofta", "Chicken Handi",

    # Mehman wali Chicken
    "Chicken Biryani", "Chicken Qorma",
    "Chicken Shahi Qorma", "Chicken Tikka Boti",
    "Chicken White Qorma", "Chicken Dum",

    # Mutton dishes (ghar wala)
    "Mutton Karahi", "Mutton Curry", "Aalu Gosht",
    "Mutton Do Pyaza", "Paye", "Nihari",
    "Mutton Kofta", "Shami Kabab",

    # Mehman wali Mutton
    "Mutton Biryani", "Mutton Qorma",
    "Mutton Shahi Qorma", "Mutton Dum Biryani",
    "Raan", "Mutton Pulao",

    # Beef dishes
    "Beef Karahi", "Beef Curry", "Beef Salan",
    "Keema", "Matar Keema", "Keema Aloo",
    "Beef Nihari", "Beef Kofta", "Haleem",
    "Beef Jalfrezi", "Beef Qorma",

    # Rice dishes
    "Daal Chawal", "Khichdi", "Matar Pulao",
    "Zeera Rice", "Yakhni Pulao", "Kabuli Pulao",
    "Chicken Biryani", "Beef Biryani", "Mutton Biryani",
    "Vegetable Pulao", "Matar Chawal",
]

# Mehman wali special dishes
mehman_dishes = [
    "Chicken Qorma", "Mutton Qorma", "Beef Qorma",
    "Chicken Shahi Qorma", "Mutton Shahi Qorma",
    "Chicken Biryani", "Mutton Biryani", "Beef Biryani",
    "Mutton Pulao", "Kabuli Pulao", "Yakhni Pulao",
    "Raan", "Chicken Tikka Boti", "Nihari",
    "Haleem", "Mutton Dum Biryani",
    "Chicken White Qorma", "Paye",
    "Shami Kabab", "Chicken Handi", "Mutton Handi"
]

# Pakistani desserts
pakistani_deserts = [
    # Common ghar wali
    "Kheer", "Seviyan", "Zarda", "Halwa Sooji",
    "Halwa Atta", "Gajar Ka Halwa", "Lauki Ka Halwa",
    "Firni", "Sheer Khurma", "Ras Malai",
    "Gulab Jamun", "Jalebi", "Kheer Chawal",

    # Mehman wali
    "Ras Malai", "Gulab Jamun", "Double Ka Meetha",
    "Shahi Tukray", "Qulfi", "Kulfi Falooda",
    "Rabri", "Barfi", "Ladoo", "Halwa Puri",
    "Phirni", "Basundi", "Kheer Kadam",
    "Pinni", "Gajrela", "Meethe Chawal"
]

# ─────────────────────────────────────────
print()
print("=" * 50)
print("   🍛 AAJKIA PAKANA HAI — Daily Food Agent")
print("=" * 50)
print("   Har jawab ke baad ENTER dabao")
print("=" * 50)
print()

# ── Sawaal 1: Family size ──
print("👨‍👩‍👧‍👦  Ghar mein aaj kitne log khaana khaenge?")
family_size = input("    >>> ").strip()
print()

# ── Sawaal 2: Occasion ──
print("🎉  Khana kis ke liye hai?")
print("     1 = Ghar wala normal khana")
print("     2 = Mehman aa rahe hain")
occasion_choice = input("    >>> ").strip()

if occasion_choice == "2":
    occasion = "MEHMAN"
    print()
    print("👥  Kitne mehman aa rahe hain?")
    mehman_count = input("    >>> ").strip()
    print()
    print("🌟  Mehman kaun hain?")
    print("     1 = Khaas rishtaydar (bari dawat)")
    print("     2 = Normal dost/rishtaydar")
    mehman_type = input("    >>> ").strip()
    if mehman_type == "1":
        occasion_detail = f"Bohat khaas mehman aa rahe hain — {mehman_count} log. Shandar aur achi dish chahiye jo impressive lage"
    else:
        occasion_detail = f"Normal mehman aa rahe hain — {mehman_count} log. Achi lekin simple dish chahiye"
else:
    occasion = "GHAR"
    occasion_detail = "Ghar ka normal roz ka simple khana"
print()

# ── Sawaal 3: Kal kya tha ──
print("🍽   Kal kya khaya tha? (repeat nahi hoga)")
print("     Jaise: Biryani, Daal Chawal, Karahi...")
last_meal = input("    >>> ").strip()
print()

# ── Sawaal 4: Kitni dishes ──
print("🍲  Aaj kitni dishes banana chahte hain?")
print("     1 = Sirf 1 dish")
print("     2 = 2 dishes (jaise salan + daal)")
print("     3 = 3 dishes (poora khana)")
dishes_count = input("    >>> ").strip()

dishes_map = {
    "1": "Sirf 1 main dish",
    "2": "2 dishes — ek main dish aur ek side dish",
    "3": "3 dishes — poora khana (main dish + daal/sabzi + kuch aur)"
}
how_many_dishes = dishes_map.get(dishes_count, "2 dishes")
print()

# ── Sawaal 5: Desert chahiye? ──
print("🍮  Kya meetha/desert bhi banana hai?")
print("     1 = Haan, desert bhi chahiye")
print("     2 = Nahi, sirf khana")
desert_choice = input("    >>> ").strip()
want_desert = desert_choice == "1"
print()

# ── Sawaal 6: Gosht ──
print("🍗  Kaunsa gosht/murgh available hai?")
print("     1 = Chicken")
print("     2 = Mutton")
print("     3 = Beef")
print("     4 = Keema")
print("     5 = Boti")
print("     6 = Kuch nahi — sirf sabzi/daal")
print("     (Ek se zyada? Jaise: 1,3 likho)")
gosht_input = input("    >>> ").strip()

gosht_map = {
    "1": "Chicken",
    "2": "Mutton",
    "3": "Beef",
    "4": "Keema",
    "5": "Boti",
    "6": "Koi gosht nahi"
}
available_gosht = []
for g in gosht_input.split(","):
    g = g.strip()
    if g in gosht_map:
        available_gosht.append(gosht_map[g])
if not available_gosht:
    available_gosht = ["Koi gosht nahi"]
print()

# ── Sawaal 7: Anday ──
print("🥚  Kya anday hain?")
print("     1 = Haan")
print("     2 = Nahi")
anday_input = input("    >>> ").strip()
anday = "Haan, anday available hain" if anday_input == "1" else "Nahi"
print()

# ── Sawaal 8: Sabziyan ──
print("🥬  Ghar mein kaunsi cheezein hain?")
print()
print("     SABZIYAN:")
print("     Aalu, Pyaz, Tamatar, Bhindi, Kaddu, Baingan,")
print("     Palak, Methi, Arvi, Shalgam, Gajar, Matar,")
print("     Gobhi, Band Gobhi, Torai, Karela, Loki,")
print("     Tinda, Mooli, Shimla Mirch, Sem, Saag,")
print("     Sarson, Adrak, Lahsan, Hara Dhania, Podina")
print()
print("     DAALEN:")
print("     Daal Mash, Daal Masoor, Daal Chana,")
print("     Daal Moong, Chana, Rajma, Lobia, Mix Daal")
print()
print("     CHAWAL / DRY:")
print("     Chawal, Maida, Sooji, Besan, Suji")
print()
print("     MEETHA (agar desert chahiye):")
print("     Cheeni, Doodh, Khoya, Seviyan, Chawal,")
print("     Suji, Gajar, Lauki, Gulab Jamun mix")
print()
available_items = input("    >>> ").strip()
print()

# ── Sawaal 9: Cooking time ──
print("⏰  Kitna time hai pakane ke liye?")
print("     1 = Jaldi  (15-25 min)")
print("     2 = Normal (30-45 min)")
print("     3 = Aram se (45-60 min)")
time_input = input("    >>> ").strip()

time_map = {
    "1": "15-25 minute — bohat jaldi chahiye",
    "2": "30-45 minute — normal time hai",
    "3": "45-60 minute — aram se bana sakte hain"
}
cooking_time = time_map.get(time_input, "30-45 minute")

print()
print("─" * 50)
print("🤔  Agent soch raha hai... thoda wait karo!")
print("─" * 50)
print()

# ─────────────────────────────────────────
# SMART PROMPT
# ─────────────────────────────────────────

if occasion == "MEHMAN":
    occasion_rule = f"""
MEHMAN KE LIYE KHAAS RULES:
- {occasion_detail}
- Sirf yeh mehman wali dishes mein se suggest karo: {mehman_dishes}
- Dish impressive aur achi honi chahiye
- Presentation acha hona chahiye
- Aam ghar wali dishes BILKUL mat dena jaise daal, bhujia, bhindi
- Qorma, Biryani, Pulao, ya khaas dishes prefer karo
- Agar chicken available hai toh Chicken Qorma ya Chicken Biryani suggest karo
- Agar mutton available hai toh Mutton Qorma ya Mutton Biryani suggest karo
"""
else:
    occasion_rule = """
GHAR KE LIYE RULES:
- Simple aur jaldi banana wali dish suggest karo
- Roz ka aam Pakistani khana dena
- Zyada expensive ya mushkil dish mat dena
"""

desert_rule = ""
if want_desert:
    desert_rule = f"""
DESERT BHI SUGGEST KARO:
- Pakistani common deserts: {pakistani_deserts}
- Sirf wohi desert suggest karo jo available items se ban sake
- Agar mehman hain toh khaas desert jaise Ras Malai, Shahi Tukray, Gulab Jamun
- Agar ghar ka khana hai toh simple jaise Kheer, Seviyan, Halwa
- Desert ka bhi poora recipe do
"""

prompt = f"""
Tu ek expert Pakistani food agent hai jo ghar aur mehman dono ke liye
perfect khana suggest karta hai.

AAJ KI SITUATION:
- Ghar mein log: {family_size}
- Maqsad: {occasion_detail}
- Kal ka khana tha: {last_meal} (aaj bilkul mat dena)
- Kitni dishes chahiye: {how_many_dishes}
- Gosht/Murgh available: {available_gosht}
- Anday: {anday}
- Available cheezein: {available_items}
- Cooking time: {cooking_time}
- Common dishes list: {common_dishes}

{occasion_rule}

SAKHT RULES:
1. SIRF wohi ingredients use karo jo available list mein hain
2. Koi extra ingredient BILKUL mat dalo
3. Kal wala khana ({last_meal}) aaj mat dena
4. Roman Urdu mein jawab do — Hindi ka lafz nahi
5. Anday sirf tab use karo jab available ho
6. Jitni dishes mangi hain utni hi suggest karo

{desert_rule}

RESPONSE FORMAT:

═══════════════════════════════
🍽 DISH 1: [Naam]
═══════════════════════════════
Kyun Sahi Hai: [1-2 lines]

Jo Chahiye:
- [ingredient 1]
- [ingredient 2]
- [ingredient 3]

Banana Kaise Hai:
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Step 4]
5. [Step 5]

Time: [minutes]
Asaan ya Mushkil: [level]
Tip: [ek kaam ki baat]

(Agar 2 ya 3 dishes hain toh same format mein likho)

(Agar desert manga hai):
═══════════════════════════════
🍮 DESERT: [Naam]
═══════════════════════════════
Jo Chahiye:
- [ingredient 1]
- [ingredient 2]

Banana Kaise Hai:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Time: [minutes]
Tip: [ek kaam ki baat]
"""

response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {
            "role": "system",
            "content": """Tu ek expert Pakistani food agent hai.
Teri zimmedarian:
1. Sirf Roman Urdu mein baat karna — Hindi bilkul nahi
2. SIRF wahi ingredients use karna jo user ne bataye hain
3. Mehman ke liye hamesha khaas aur impressive dish dena
4. Ghar ke liye simple aur asaan dish dena
5. Koi extra ingredient mat dalna chahe kuch bhi ho"""
        },
        {
            "role": "user",
            "content": prompt
        }
    ]
)

print("=" * 50)
print("   🍛 AAJ KA KHANA — Agent Ki Suggestion")
print("=" * 50)
print()
print(response.choices[0].message.content)
print()
print("=" * 50)
print("📝 Kal ke liye note kar lo — aaj kya bana!")
print("=" * 50)