// biome-ignore lint/performance/noNamespaceImport: Need to import all matchers to extend expect
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";

expect.extend(matchers);
