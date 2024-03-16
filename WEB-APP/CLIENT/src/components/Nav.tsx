import React from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/navbar";

import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";

export default function Nav() {
  return (
    <Navbar shouldHideOnScroll>
      <NavbarBrand>
        <p className="font-bold text-inherit">re-Script</p>
      </NavbarBrand>
      <NavbarContent
        className="hidden gap-4 sm:flex"
        justify="center"
      ></NavbarContent>
      <NavbarContent justify="end">
        <NavbarItem>
          <Button as={Link} href="/unminify" variant="flat">
            Try Now
          </Button>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
