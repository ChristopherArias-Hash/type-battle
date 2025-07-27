package com.example.type_battle.controller;


import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PublicController {

    @GetMapping("ping")
        public ResponseEntity<String> pingServer( ){
        return ResponseEntity.ok("Ping server works :O");
    }

}

