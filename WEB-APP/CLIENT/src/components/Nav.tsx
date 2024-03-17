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
        <Link href="/" className="text-inherit">
          <p className="text-2xl font-bold text-inherit">re:Script</p>
        </Link>
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
