from bs4 import BeautifulSoup
import json

def extract_greetings(html_data):
    soup = BeautifulSoup(html_data, 'html.parser')
    greetings_list = []
    for item in soup.find_all('font'):
        if item.get('class') and 'japanese' in item.get('class'):
            greeting = item.get_text()
            audio_tag = item.find_next_sibling('br').find_next_sibling()
            if audio_tag and '[sound:' in audio_tag.string:
                audio_file = audio_tag.string.strip()
                meaning_tag = audio_tag.find_next_sibling('font', {'class': 'text'})
                if meaning_tag:
                    meaning = meaning_tag.get_text()
                else:
                    meaning = None
                greetings_list.append({'greeting': greeting.strip(), 'audio_file': audio_file, 'meaning': meaning})
    return greetings_list

def main():
    with open("/Users/huntermcnichols/Downloads/Genki 1.txt", "r", encoding="utf-8") as file:
        html_data = file.read()

    greetings_data = extract_greetings(html_data)
    json_data = json.dumps(greetings_data, ensure_ascii=False, indent=4)
    print(json_data)

if __name__ == "__main__":
    main()
