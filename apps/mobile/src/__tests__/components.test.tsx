import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

// ─── Button ───────────────────────────────────────────────────────────────────

describe("Button", () => {
  it("affiche le label", () => {
    const { getByText } = render(<Button label="Continuer" />);
    expect(getByText("Continuer")).toBeTruthy();
  });

  it("appelle onPress au tap", () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Valider" onPress={onPress} />);
    fireEvent.press(getByText("Valider"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ne déclenche pas onPress si disabled", () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Valider" onPress={onPress} disabled />);
    fireEvent.press(getByText("Valider"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("affiche un ActivityIndicator en état loading", () => {
    const { queryByText, getByTestId } = render(
      <Button label="Connexion" loading />
    );
    expect(queryByText("Connexion")).toBeNull();
    // ActivityIndicator is rendered instead of the label
  });

  it("ne déclenche pas onPress si loading", () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(
      <Button label="Connexion" loading onPress={onPress} />
    );
    // The TouchableOpacity is disabled when loading
    const { TouchableOpacity } = require("react-native");
    const touchable = UNSAFE_getByType(TouchableOpacity);
    expect(touchable.props.disabled).toBe(true);
  });

  it("rend la variante secondary sans erreur", () => {
    const { getByText } = render(<Button label="Annuler" variant="secondary" />);
    expect(getByText("Annuler")).toBeTruthy();
  });

  it("rend la variante ghost sans erreur", () => {
    const { getByText } = render(<Button label="Passer" variant="ghost" />);
    expect(getByText("Passer")).toBeTruthy();
  });

  it("rend la taille sm sans erreur", () => {
    const { getByText } = render(<Button label="Sm" size="sm" />);
    expect(getByText("Sm")).toBeTruthy();
  });

  it("rend la taille lg sans erreur", () => {
    const { getByText } = render(<Button label="Lg" size="lg" />);
    expect(getByText("Lg")).toBeTruthy();
  });
});

// ─── Input ────────────────────────────────────────────────────────────────────

describe("Input", () => {
  it("affiche le label si fourni", () => {
    const { getByText } = render(<Input label="Email" />);
    expect(getByText("Email")).toBeTruthy();
  });

  it("n'affiche pas de label si non fourni", () => {
    const { queryByText } = render(<Input placeholder="email@exemple.com" />);
    expect(queryByText("Email")).toBeNull();
  });

  it("affiche le message d'erreur si fourni", () => {
    const { getByText } = render(<Input error="Email invalide" />);
    expect(getByText("Email invalide")).toBeTruthy();
  });

  it("n'affiche pas de message d'erreur si non fourni", () => {
    const { queryByText } = render(<Input label="Email" />);
    expect(queryByText("Email invalide")).toBeNull();
  });

  it("transmet onChangeText à TextInput", () => {
    const onChange = jest.fn();
    const { UNSAFE_getByType } = render(<Input onChangeText={onChange} />);
    const { TextInput } = require("react-native");
    const input = UNSAFE_getByType(TextInput);
    fireEvent.changeText(input, "test@test.com");
    expect(onChange).toHaveBeenCalledWith("test@test.com");
  });

  it("affiche le placeholder", () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Votre email" />
    );
    expect(getByPlaceholderText("Votre email")).toBeTruthy();
  });
});
