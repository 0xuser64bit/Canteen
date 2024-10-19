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
