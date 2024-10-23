import { City, Country, State } from "country-state-city";

export const getFullLocationNames = ({
  country,
  selectedState,
  selectedCity,
}: {
  country: string;
  selectedState: string;
  selectedCity: string;
}) => {
  const fullCountry = Country.getCountryByCode(country);
  const fullState = State.getStateByCodeAndCountry(selectedState, country);
  const fullCity = City.getCitiesOfState(country, selectedState).find(
    (city) => city.name === selectedCity,
  );

  return {
    countryName: fullCountry?.name || "",
    stateName: fullState?.name || "",
    cityName: fullCity?.name || selectedCity, // fallback to selectedCity if not found
  };
};

export const formatDate = (dateString: Date) => {
  const options: any = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

export const generateRandomColour = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

export const shuffleArray = (arr: any[]) => {
  arr.map((item, i) => {
    let randomIdx = Math.floor(Math.random() * (i + 1));
    let temp = arr[i];
    arr[i] = arr[randomIdx];
    arr[randomIdx] = temp;
  });
  return arr;
};
